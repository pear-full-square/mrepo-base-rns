# master

Makes the node its swarm's master: the lookup db made here, the node itself registered in it.

## Signature

`master(exec, { args })`: requested as `rns/master . <swarm> [<lease>]`
at the node, by the mrepo that makes the swarm.

## Arguments

1. The swarm's name: `swarm-1`. Required.
2. The lease, in seconds: how long a node stays active without renewing.
   15 when none.

## Returns

`{ master, swarm, lease, lookup: { uri, machine, folder, key, registry } }`:
the lease in milliseconds; `lookup` what a node needs to find the lookup
db: the master's unique URI, where it lives, its key and the key of the
topic the db is. Given to each node at its `join`.

## Errors

- No name, or one that is none: `missing argument: swarm`, `not a
  swarm's name`. A lease that is no number above zero: `not a lease`.
- In a swarm already, another or as a node: `in a swarm already`. Asked
  again for the same swarm, it answers the same.
- Its program not running: `rns is not running here`.
