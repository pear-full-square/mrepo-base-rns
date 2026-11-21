// resolve: rns/resolve <unique URI>, where a node of the swarm lives, from
// the lookup db as this node holds it (README.md beside it).
import { ask } from '../../internal/client/index.js'

export async function resolve (exec, { args: [uri] = [] }) {
  const dir = exec.runtime.dir
  if (!dir) throw new Error('no directory in the context')
  if (typeof uri !== 'string' || !uri) throw new Error('missing argument: node')
  const r = await ask(dir, { op: 'resolve', uri })
  exec.log('verbose', 'resolved', { uri, machine: r.machine, state: r.state })
  return r
}
