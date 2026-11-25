// leave: rns/leave <node>, a node taken out of the swarm's lookup db, at
// the master (README.md beside it).
import { ask } from '../../internal/client/index.js'

export async function leave (exec, { args: [uri] = [] }) {
  const dir = exec.runtime.dir
  if (!dir) throw new Error('no directory in the context')
  if (typeof uri !== 'string' || !uri) throw new Error('missing argument: node')
  const r = await exec.step('leave', r => ({ left: r.left }), () => ask(dir, { op: 'leave', uri }))
  exec.log('info', 'left', { uri, registered: r.left !== null })
  return r
}
