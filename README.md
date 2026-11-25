# mrepo-base-rns

The mrepo rns protocol: a swarm's lookup db on every node, who is registered, where each lives, who is active.

Every node of a swarm runs it. The lookup db is a topic the swarm's
master writes; each node holds a replica and answers from it. A node is
registered by the mrepo that created it, asked of the master; it is
active while its own rns renews its lease there, and quiet once the
lease ran out. Offered by `haiccing/base-package-rns`, whose program
is the node's rns as a process.

## Links

- [external](external/)
- [internal](internal/)
- [test](test/)

## Commands

```
haicc <master> rns/master . swarm-1 15
haicc <node> rns/join . swarm-1 '<lookup>'
haicc <master> rns/register . '<node>'
haicc <node> rns/status
haicc <node> rns/resolve . swarm-1/node-2
haicc <master> rns/leave . swarm-1/node-2
```

## Design

- **One writer**: the master's rns writes the lookup db; a creator asks
  it to register what it created, a node's rns asks it to renew its
  lease. More masters or creators later: a topic each, the db their
  merged view.
- **Liveness is data**: the master appends a record when a node turns
  active or quiet, so a node's replica says who is active as of its last
  turn (`synced`). Leases themselves are held in memory: a master
  started again grants each node one anew.
- **No connection without purpose**: a node opens one to renew its
  lease, a third of the lease apart, and one to replicate when the
  master's topic is longer than its replica; each ended at once.
- **A lease is renewed by the key the node was registered with**: its
  rns' identity, a keypair of its store; another's is refused.
- **On one machine** the route to the master is its socket, in its
  folder (`p2p-process`); the lookup db says each node's machine and
  folder. The route to another machine is not built.
- **Its side of the mrepo's folder**, `rns/`: its store, its config
  (`node.json`) and its socket: this machine's, not a layer's. The
  store holds its keys in clear.

## Tests

- `brittle-bare test/*.test.js` (Bare installed): each test by its name in [test/](test/).
