import test from 'brittle'
import { mkdtempSync } from 'bare-fs'
import { join as joinPath } from 'bare-path'
import { tmpdir } from 'bare-os'
import { fold, view, serve, ask, lookup, configure, master, join, register, leave, resolve, status } from '../index.js'

const dir = () => mkdtempSync(joinPath(tmpdir(), 'rns-'))
// An execution as an action sees it: the mrepo's folder and unique URI, its log.
const execution = (dir, uri) => ({ runtime: { dir, uri }, entries: [], log (level, event, data = {}) { this.entries.push({ level, event, ...data }) }, async step (event, data, fn) { const r = await fn(); this.log('verbose', event, typeof data === 'function' ? data(r) : data); return r } })
const states = s => Object.fromEntries(s.nodes.map(n => [n.uri, n.state]))

test('the lookup db folded from its records: registered, active, quiet, left; the master first', (t) => {
  const records = [
    { offset: 0, timestamp: 't0', value: { op: 'register', uri: 'swarm-1/node-2', role: 'node', key: 'k2', where: { machine: 'm', folder: '/n2' }, by: 'local/host' } },
    { offset: 1, timestamp: 't1', value: { op: 'register', uri: 'swarm-1/master', role: 'master', key: 'k0', where: { machine: 'm', folder: '/m' } } },
    { offset: 2, timestamp: 't2', value: { op: 'register', uri: 'swarm-1/node-1', role: 'node', key: 'k1', where: { machine: 'm', folder: '/n1' } } },
    { offset: 3, timestamp: 't3', value: { op: 'active', uri: 'swarm-1/node-2' } },
    { offset: 4, timestamp: 't4', value: { op: 'quiet', uri: 'swarm-1/node-2', since: 't3b' } },
    { offset: 5, timestamp: 't5', value: { op: 'leave', uri: 'swarm-1/node-1' } },
    { offset: 6, timestamp: 't6', value: { op: 'active', uri: 'swarm-1/gone' } }
  ]
  t.alike(view(fold(records)).map(n => [n.uri, n.role, n.state, n.since]), [['swarm-1/master', 'master', 'active', 't1'], ['swarm-1/node-2', 'node', 'quiet', 't3b']], 'the master active from its registration, a node quiet since its lease ran out, one that left gone, a record about none skipped')
  t.alike(view(fold(records.slice(0, 3))).map(n => n.state), ['active', 'registered', 'registered'], 'registered: no lease renewed yet')
})

test('a swarm on one machine: its master, a node registered by its creator, active by its lease, gone quiet, back, left', async (t) => {
  let clock = Date.parse('2026-11-21T00:00:00.000Z')
  const now = () => clock
  const [m, n1, n2] = [dir(), dir(), dir()]
  const alone = await serve({ dir: n1, every: 1e9, now })
  t.alike([alone.status().joined, alone.status().nodes], [false, []], 'a node in no swarm: its rns running, nothing in it')
  await t.exception(lookup(n1).resolve('swarm-1/master'), /not in a swarm/)
  // the master: the action writes its config, its program takes it up
  const M = await serve({ dir: m, every: 1e9, now })
  const made = await master(execution(m, 'swarm-1/master'), { args: ['swarm-1', '3'] })
  t.alike([made.master, made.swarm, made.lease, made.lookup.uri, made.lookup.folder, made.lookup.key], ['swarm-1/master', 'swarm-1', 3000, 'swarm-1/master', m, M.key], 'rns/master: the lookup db made, what a node needs to find it answered')
  t.alike(states(await status(execution(m, 'swarm-1/master'))), { 'swarm-1/master': 'active' }, 'the master registered in it, active')
  await t.exception(master(execution(m, 'swarm-1/master'), { args: ['swarm-2'] }), /in a swarm already: swarm-1, as its master/)
  // a node joins: where its lookup db is; not registered yet
  const joined = await join(execution(n1, 'swarm-1/node-1'), { args: ['swarm-1', JSON.stringify(made.lookup)] })
  t.alike(joined, { joined: 'swarm-1', uri: 'swarm-1/node-1', key: alone.key, machine: made.lookup.machine, folder: n1 }, 'rns/join: what its creator registers it with')
  t.is(alone.status().error, 'not registered: swarm-1/node-1', 'not registered yet: said in its status')
  await t.exception(register(execution(n1, 'swarm-1/node-1'), { args: [JSON.stringify({ ...joined, by: 'local/host' })] }), /not the master: rns register is asked of the swarm's master \(swarm-1\/master\)/, 'registering is asked of the master')
  t.alike(await register(execution(m, 'swarm-1/master'), { args: [JSON.stringify({ ...joined, by: 'local/host' })] }), { registered: 'swarm-1/node-1', already: false, lease: 3000 }, 'rns/register at the master, by its creator')
  t.is((await register(execution(m, 'swarm-1/master'), { args: [JSON.stringify(joined)] })).already, true, 'again: there already')
  t.alike(states(M.status()), { 'swarm-1/master': 'active', 'swarm-1/node-1': 'registered' }, 'registered: no lease renewed yet')
  clock += 1000
  await alone.tick()
  t.alike(states(M.status()), { 'swarm-1/master': 'active', 'swarm-1/node-1': 'active' }, 'its lease renewed by its own rns: active')
  t.alike(states(await status(execution(n1, 'swarm-1/node-1'))), { 'swarm-1/master': 'active', 'swarm-1/node-1': 'active' }, 'rns/status at the node: the same, from its replica of the lookup db')
  t.alike([alone.status().synced, alone.status().error], ['2026-11-21T00:00:01.000Z', undefined], 'when it was brought up to date')
  const where = await resolve(execution(n1, 'swarm-1/node-1'), { args: ['swarm-1/master'] })
  t.alike([where.uri, where.role, where.machine, where.folder, where.key], ['swarm-1/master', 'master', made.lookup.machine, m, M.key], 'rns/resolve at the node: where the master lives')
  await t.exception(resolve(execution(n1, 'swarm-1/node-1'), { args: ['swarm-1/nope'] }), /not registered: swarm-1\/nope \(swarm-1\/master, swarm-1\/node-1\)/)
  // a second node, registered and never started: gone quiet when its lease runs out
  await ask(m, { op: 'register', record: { uri: 'swarm-1/node-2', key: 'ab'.repeat(32), machine: 'elsewhere', folder: n2 } })
  clock += 2000
  await alone.tick()
  clock += 1500
  await M.tick()
  t.alike(states(M.status()), { 'swarm-1/master': 'active', 'swarm-1/node-1': 'active', 'swarm-1/node-2': 'quiet' }, 'the master\'s sweep: a node whose lease ran out, quiet; one that renewed, active')
  t.is(M.status().nodes[2].since, '2026-11-21T00:00:04.000Z', 'quiet since its lease ran out')
  t.is(states(alone.status())['swarm-1/node-2'], 'registered', 'the node\'s replica: as of its last turn')
  clock += 1000
  await alone.tick()
  t.is(states(alone.status())['swarm-1/node-2'], 'quiet', 'at its next: seen quiet there too')
  // another's key does not renew a node's lease
  const other = await serve({ dir: n2, every: 1e9, now })
  configure(n2, { role: 'node', swarm: 'swarm-1', uri: 'swarm-1/node-1', master: made.lookup })
  t.is((await ask(n2, { op: 'configure' })).error, 'not its key: swarm-1/node-1 is registered by another', 'a lease is renewed by the key it was registered with')
  await other.close()
  // node-1 goes quiet (its rns ended), then comes back
  await alone.close()
  clock += 3500
  await M.tick()
  t.is(states(M.status())['swarm-1/node-1'], 'quiet', 'its rns ended: gone quiet')
  const back = await serve({ dir: n1, every: 1e9, now })
  t.alike([back.key, states(M.status())['swarm-1/node-1']], [alone.key, 'active'], 'started again: the same key, its lease renewed, active again')
  // the master started again: its lookup db kept
  await M.close()
  const again = await serve({ dir: m, every: 1e9, now })
  t.alike([again.key, states(again.status())], [M.key, { 'swarm-1/master': 'active', 'swarm-1/node-1': 'active', 'swarm-1/node-2': 'quiet' }], 'the master started again: the same key, the lookup db as it was')
  t.alike(await leave(execution(m, 'swarm-1/master'), { args: ['swarm-1/node-2'] }), { left: 'swarm-1/node-2' }, 'rns/leave at the master: taken out')
  t.alike(await leave(execution(m, 'swarm-1/master'), { args: ['swarm-1/node-2'] }), { left: null }, 'again: not there')
  await t.exception(leave(execution(m, 'swarm-1/master'), { args: ['swarm-1/master'] }), /the master does not leave/)
  await back.close()
  await again.close()
  t.alike(await status(execution(m, 'swarm-1/master')), { running: false, joined: false, nodes: [] }, 'rns/status with no program running: said, not refused')
  await t.exception(resolve(execution(m, 'swarm-1/master'), { args: ['swarm-1/master'] }), /rns is not running here/)
})

test('what is missing or not as it is to be: said', async (t) => {
  const d = dir()
  const exec = execution(d, 'swarm-1/x')
  await t.exception(master(exec, { args: [] }), /missing argument: swarm/)
  await t.exception(master(exec, { args: ['Swarm'] }), /not a swarm's name/)
  await t.exception(master(exec, { args: ['swarm-1', 'soon'] }), /not a lease: soon/)
  await t.exception(join(exec, { args: ['swarm-1'] }), /missing argument: lookup/)
  await t.exception(join(exec, { args: ['swarm-1', '{"uri":"x"}'] }), /not a lookup/)
  await t.exception(register(exec, { args: [] }), /missing argument: node/)
  await t.exception(register(exec, { args: ['{}'] }), /not a node/)
  await t.exception(leave(exec, { args: [] }), /missing argument: node/)
  await t.exception(resolve(exec, { args: [] }), /missing argument: node/)
})
