// mrepo-base-rns: its documented methods, a directory each (README.md beside each).
//   external/   the rns protocol's actions: master, join, register, leave,
//               resolve, status
//   internal/   lookup: the lookup db folded from its records
//               program: the node's rns as its own process: its store, its
//               lease, its replica, its socket
//               client: the node's rns asked, from an action or from
//               another module (ask, lookup, SIDE)
export { master } from './external/master/index.js'
export { join } from './external/join/index.js'
export { register } from './external/register/index.js'
export { leave } from './external/leave/index.js'
export { resolve } from './external/resolve/index.js'
export { status } from './external/status/index.js'
export { fold, apply, view, STATES } from './internal/lookup/index.js'
export { serve, program, LEASE } from './internal/program/index.js'
export { ask, lookup, configOf, configure, SIDE, SOCKET, CONFIG } from './internal/client/index.js'
