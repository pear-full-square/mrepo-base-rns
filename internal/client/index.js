// client: the node's rns asked: its program, over its socket in the
// mrepo's folder; its config, written for it (README.md beside it).
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'bare-fs'
import { join } from 'bare-path'
import { socketOf, request } from 'p2p-process'

// The rns' side of an mrepo's folder: its store, its config, its socket.
export const SIDE = 'rns'
export const SOCKET = 'rns'
// Its config, this machine's: what the node is in its swarm.
//   { role: 'master', swarm, uri, lease }
//   { role: 'node', swarm, uri, master: { uri, machine, folder, key, registry } }
export const CONFIG = 'node.json'

export function configOf (dir) {
  const file = join(dir, SIDE, CONFIG)
  if (!existsSync(file)) return null
  // catch: not whole or not JSON: no config to go by yet
  try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return null }
}

// Written aside, then renamed: never read half written.
export function configure (dir, config) {
  mkdirSync(join(dir, SIDE), { recursive: true })
  const file = join(dir, SIDE, CONFIG)
  writeFileSync(`${file}.new`, JSON.stringify(config, null, 2) + '\n')
  renameSync(`${file}.new`, file)
  return config
}

// The node's own program asked: { op, ... } -> its answer. Not running:
// said, with how it is started.
export async function ask (dir, body, { timeout = 10000 } = {}) {
  // catch: no program behind the socket: said as not running, the cause kept
  try { return await request(socketOf(join(dir, SIDE), SOCKET), body, { timeout }) } catch (err) {
    if (/^not reachable/.test(err.message)) throw new Error('rns is not running here (its program starts with the service: service/start)', { cause: err })
    throw err
  }
}

// The lookup db as another module reads it, through the node's rns:
//   lookup(dir).resolve(uri)   -> its record; not registered: throws
//   lookup(dir).status()       -> the swarm as this node sees it
export const lookup = dir => ({
  resolve: uri => ask(dir, { op: 'resolve', uri }),
  status: () => ask(dir, { op: 'status' })
})
