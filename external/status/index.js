// status: rns/status, the swarm as this node's lookup db has it: who is
// registered, who is active (README.md beside it).
import { existsSync } from 'bare-fs'
import { join } from 'bare-path'
import { socketOf } from 'p2p-local'
import { ask, SIDE, SOCKET } from '../../internal/client/index.js'

export async function status (exec) {
  const dir = exec.runtime.dir
  if (!dir) throw new Error('no directory in the context')
  // (not started: answered, not refused: a status says what is there)
  if (!existsSync(socketOf(join(dir, SIDE), SOCKET))) { exec.log('verbose', 'not running', {}); return { running: false, joined: false, nodes: [] } }
  const s = await ask(dir, { op: 'status' })
  exec.log('verbose', 'status', { joined: s.joined, nodes: s.nodes.length })
  return s
}
