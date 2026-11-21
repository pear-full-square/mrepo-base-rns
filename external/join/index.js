// join: rns/join <swarm> <lookup>, the node made a node of a swarm: where
// its lookup db is, at the master (README.md beside it).
import { ask, configOf, configure } from '../../internal/client/index.js'

const NAME = /^[a-z][a-z0-9-]*$/
const HEX = /^[0-9a-f]{64}$/

export async function join (exec, { args: [swarm, given] = [] }) {
  const dir = exec.runtime.dir
  if (!dir) throw new Error('no directory in the context')
  if (!swarm) throw new Error('missing argument: swarm')
  if (!NAME.test(swarm)) throw new Error(`not a swarm's name: ${swarm} (lowercase letters, digits, hyphens)`)
  if (given === undefined) throw new Error('missing argument: lookup')
  let m = null
  // catch: not JSON: said below, with what it is to be
  try { m = typeof given === 'string' ? JSON.parse(given) : given } catch {}
  if (!m || typeof m.uri !== 'string' || typeof m.machine !== 'string' || typeof m.folder !== 'string' || !HEX.test(m.key ?? '') || !HEX.test(m.registry ?? '')) throw new Error('not a lookup: { uri, machine, folder, key, registry } (the master\'s, as rns/master answers it)')
  const uri = exec.runtime.uri
  const master = { uri: m.uri, machine: m.machine, folder: m.folder, key: m.key, registry: m.registry }
  const was = configOf(dir)
  if (was && (was.role !== 'node' || was.swarm !== swarm || was.master.registry !== master.registry)) throw new Error(`in a swarm already: ${was.swarm}, as ${was.role === 'master' ? 'its master' : 'a node'} (deploy and teardown: no change in place)`)
  if (!was) configure(dir, { role: 'node', swarm, uri, master })
  const s = await exec.step('configure', r => ({ synced: r.synced ?? null }), () => ask(dir, { op: 'configure' }))
  exec.log('info', 'joined', { swarm, uri, master: master.uri })
  // what its creator registers it with, at the master
  return { joined: swarm, uri, key: s.key, machine: s.machine, folder: s.folder }
}
