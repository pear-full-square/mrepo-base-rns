// program: a node's rns as its own process: its store, its identity, its
// socket; the master's registry and leases; a node's lease renewed and
// its replica of the lookup db brought up to date (README.md beside it).
import process from 'bare-process'
import os from 'bare-os'
import Corestore from 'corestore'
import { existsSync, writeFileSync, renameSync, rmSync, mkdirSync } from 'bare-fs'
import { join } from 'bare-path'
import { topics } from 'p2p-topic'
// The lookup db's records' encoding: one line to change it (its type:
// the rns package's types/lookup-entry.avsc).
import * as handler from 'mycelium-value-json'
import { socketOf, listen, request, open } from 'p2p-local'
import { apply, view } from '../lookup/index.js'
import { configOf, SIDE, SOCKET } from '../client/index.js'

// A lease, in ms, when the master was given none.
export const LEASE = 15000
const REGISTRY = 'registry'
const hex = b => Buffer.from(b).toString('hex')
// catch: no such process: not alive
const alive = pid => { try { os.kill(pid, 0); return true } catch { return false } }

// The rns of the mrepo in `dir`, served until closed.
//   every   its tick, in ms: the master's sweep, a node's renewal when due
//   now     the clock (a test's)
// -> { socket, key, status(), tick(), close() }
export async function serve ({ dir, every = 500, now = () => Date.now() }) {
  const side = join(dir, SIDE)
  mkdirSync(side, { recursive: true })
  const store = new Corestore(join(side, 'store'))
  await store.ready()
  const t = topics(store, { handler })
  const identity = await t.keyPair('node')
  const key = hex(identity.publicKey)
  const where = { machine: os.hostname(), folder: dir }
  const socket = socketOf(side, SOCKET)

  let config = null
  let registry = null // the topic: the master's own, a node's replica
  let folded = 0 // its records applied so far
  const nodes = new Map()
  const leases = new Map() // the master's: uri -> until
  let lease = LEASE
  let renewed = 0 // a node's: when it last renewed
  let synced = null
  let error = null

  // One at a time: what writes the registry or reads the config.
  let chain = Promise.resolve()
  // catch: what a turn threw is its caller's; the chain goes on
  const queued = fn => { const r = chain.then(fn); chain = r.catch(() => {}); return r }

  const refold = async () => {
    for (const record of await registry.read({ from: folded })) { apply(nodes, record); folded = record.offset + 1 }
  }
  const append = async value => { await registry.append(value, { key: value.uri }); await refold() }

  // The config read; changed: taken up (the master's registry made, itself
  // registered in it; a node's replica opened).
  const configured = async () => {
    const c = configOf(dir)
    if (!c || JSON.stringify(c) === JSON.stringify(config)) return
    config = c
    if (c.role === 'master') {
      lease = c.lease ?? LEASE
      registry = await t.own(REGISTRY)
      await refold()
      if (!nodes.has(c.uri)) await append({ op: 'register', uri: c.uri, role: 'master', key, where, by: c.uri })
      // (leases are not kept: each node registered holds one again from now)
      for (const n of nodes.values()) if (n.role !== 'master' && n.state !== 'quiet') leases.set(n.uri, now() + lease)
    } else {
      registry = await t.replica(c.master.registry)
      await refold()
    }
  }

  // A node's turn: its lease renewed at the master; the registry there
  // longer than its replica: replicated, over a connection opened for it.
  const renew = async () => {
    const at = socketOf(join(config.master.folder, SIDE), SOCKET)
    renewed = now()
    try {
      const r = await request(at, { op: 'renew', uri: config.uri }, { keyPair: identity, peer: config.master.key })
      lease = r.lease
      if (registry.length < r.registry.length) {
        const stream = await open(at, { keyPair: identity, peer: config.master.key, hello: { replicate: REGISTRY } })
        store.replicate(stream)
        try { await registry.fetch({ length: r.registry.length }) } finally { stream.destroy() }
      }
      await refold()
      synced = new Date(now()).toISOString()
      error = null
    } catch (err) {
      // (said in its status; tried again at its next turn)
      error = err.message
    }
  }

  const turn = async () => {
    await configured()
    if (!config) return
    if (config.role === 'master') {
      for (const n of view(nodes)) {
        if (n.role === 'master' || n.state === 'quiet') continue
        const until = leases.get(n.uri) ?? leases.set(n.uri, now() + lease).get(n.uri)
        if (until <= now()) await append({ op: 'quiet', uri: n.uri, since: new Date(until).toISOString() })
      }
    // (a turn that failed is taken again sooner: a node not registered yet, a master starting)
    } else if (now() - renewed >= (error ? Math.min(1000, lease / 3) : lease / 3)) await renew()
  }
  const tick = () => queued(turn)

  const status = () => ({
    running: true,
    key,
    ...where,
    joined: Boolean(config),
    ...(config ? { swarm: config.swarm, uri: config.uri, role: config.role, master: config.role === 'master' ? config.uri : config.master.uri, lease, registry: { key: registry.key, length: registry.length }, ...(config.role === 'node' ? { synced, ...(error ? { error } : {}) } : {}) } : {}),
    nodes: view(nodes).map(n => ({ uri: n.uri, role: n.role, state: n.state, since: n.since, machine: n.where?.machine ?? null }))
  })
  const master = op => { if (config?.role !== 'master') throw new Error(`not the master: rns ${op} is asked of the swarm's master${config ? ` (${config.master.uri})` : ''}`) }

  const ops = {
    status: async () => status(),
    // (the config written for it: taken up now, not at the next tick)
    configure: async () => { await turn(); return status() },
    resolve: async ({ uri }) => {
      if (!config) throw new Error('not in a swarm: no lookup db here (rns/join)')
      const n = nodes.get(uri)
      if (!n) throw new Error(`not registered: ${uri} (${view(nodes).map(n => n.uri).join(', ') || 'none'})`)
      return { uri: n.uri, role: n.role, state: n.state, since: n.since, key: n.key, ...n.where }
    },
    register: async ({ record }) => {
      master('register')
      const was = nodes.get(record.uri)
      if (was && was.key !== record.key) throw new Error(`registered already, by another key: ${record.uri} (rns/leave first)`)
      if (!was) {
        await append({ op: 'register', uri: record.uri, role: 'node', key: record.key, where: { machine: record.machine, folder: record.folder }, by: record.by ?? null })
        leases.set(record.uri, now() + lease)
      }
      return { registered: record.uri, already: Boolean(was), lease }
    },
    leave: async ({ uri }) => {
      master('leave')
      const was = nodes.get(uri)
      if (was?.role === 'master') throw new Error(`the master does not leave: ${uri}`)
      if (was) { await append({ op: 'leave', uri }); leases.delete(uri) }
      return { left: was ? uri : null }
    },
    renew: async ({ uri }, { peer }) => {
      master('renew')
      const n = nodes.get(uri)
      if (!n) throw new Error(`not registered: ${uri}`)
      if (n.key !== peer) throw new Error(`not its key: ${uri} is registered by another`)
      leases.set(uri, now() + lease)
      if (n.state !== 'active') await append({ op: 'active', uri })
      return { uri, lease, registry: { key: registry.key, length: registry.length } }
    }
  }

  const server = listen({
    path: socket,
    keyPair: identity,
    onrequest: (body, peer) => {
      if (!ops[body?.op]) throw new Error(`no such op: ${body?.op}`)
      return queued(() => ops[body.op](body, peer))
    },
    // (replication: whatever this store holds; a connection opened for it, ended by who opened it)
    onstream: stream => { store.replicate(stream) }
  })
  await tick()
  // catch: a tick that failed is taken again at the next
  const timer = setInterval(() => { tick().catch(() => {}) }, every)
  return {
    socket,
    key,
    status,
    tick,
    async close () {
      clearInterval(timer)
      await chain
      await server.close()
      await store.close()
    }
  }
}

// The program: the rns served in this process until it is ended (SIGTERM,
// SIGINT), its mrepo's folder is gone or its mrepo's runtime has ended.
// What runtime/start hands it:
//   --dir=<the mrepo's folder> --runtime=<pid> --state=<file>
export async function program (argv) {
  const arg = name => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3)
  const dir = arg('dir')
  const state = arg('state')
  if (!dir || !state) throw new Error('--dir=<the mrepo\'s folder> --state=<file> [--runtime=<pid>]')
  const runtime = arg('runtime') ? Number(arg('runtime')) : null
  const s = await serve({ dir })
  writeFileSync(`${state}.new`, JSON.stringify({ pid: process.pid, socket: s.socket, key: s.key, started: new Date().toISOString() }) + '\n')
  renameSync(`${state}.new`, state)
  let closing = null
  const close = () => (closing ??= s.close().then(() => rmSync(state, { force: true })))
  await new Promise(resolve => {
    const end = () => close().then(resolve, resolve)
    process.on('SIGTERM', end)
    process.on('SIGINT', end)
    const t = setInterval(() => { if (!existsSync(dir) || (runtime && !alive(runtime))) { clearInterval(t); end() } }, 250)
  })
}
