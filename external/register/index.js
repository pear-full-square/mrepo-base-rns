// register: rns/register <node>, a node registered in the swarm's lookup
// db by its creator, at the master (README.md beside it).
import { ask } from '../../internal/client/index.js'

const HEX = /^[0-9a-f]{64}$/

export async function register (exec, { args: [given] = [] }) {
  const dir = exec.runtime.dir
  if (!dir) throw new Error('no directory in the context')
  if (given === undefined) throw new Error('missing argument: node')
  let n = null
  // catch: not JSON: said below, with what it is to be
  try { n = typeof given === 'string' ? JSON.parse(given) : given } catch {}
  if (!n || typeof n.uri !== 'string' || typeof n.machine !== 'string' || typeof n.folder !== 'string' || !HEX.test(n.key ?? '')) throw new Error('not a node: { uri, key, machine, folder, by? } (as its rns/join answered it)')
  const r = await exec.step('register', r => ({ uri: n.uri, already: r.already }), () => ask(dir, { op: 'register', record: { uri: n.uri, key: n.key, machine: n.machine, folder: n.folder, by: typeof n.by === 'string' ? n.by : null } }))
  exec.log('info', 'registered', { uri: n.uri, by: n.by ?? null, already: r.already })
  return r
}
