// master: rns/master <swarm> [lease], the node made its swarm's master:
// the lookup db made here (README.md beside it).
import { ask, configOf, configure } from '../../internal/client/index.js'

const NAME = /^[a-z][a-z0-9-]*$/

export async function master (exec, { args: [swarm, seconds] = [] }) {
  const dir = exec.runtime.dir
  if (!dir) throw new Error('no directory in the context')
  if (!swarm) throw new Error('missing argument: swarm')
  if (!NAME.test(swarm)) throw new Error(`not a swarm's name: ${swarm} (lowercase letters, digits, hyphens)`)
  const lease = seconds === undefined ? null : Number(seconds)
  if (lease !== null && !(lease > 0)) throw new Error(`not a lease: ${seconds} (seconds)`)
  const uri = exec.runtime.uri
  const was = configOf(dir)
  if (was && (was.role !== 'master' || was.swarm !== swarm)) throw new Error(`in a swarm already: ${was.swarm}, as ${was.role === 'master' ? 'its master' : 'a node'} (deploy and teardown: no change in place)`)
  if (!was) configure(dir, { role: 'master', swarm, uri, ...(lease ? { lease: lease * 1000 } : {}) })
  const s = await exec.step('configure', r => ({ registry: r.registry?.length ?? null }), () => ask(dir, { op: 'configure' }))
  exec.log('info', 'master', { swarm, uri, registry: s.registry.key })
  // what a node needs to find the lookup db: given to each at its join
  return { master: uri, swarm, lease: s.lease, lookup: { uri, machine: s.machine, folder: s.folder, key: s.key, registry: s.registry.key } }
}
