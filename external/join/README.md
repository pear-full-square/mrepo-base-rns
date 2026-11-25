# join

Makes the node a node of a swarm: told where the swarm's lookup db is, at its master.

## Signature

`join(exec, { args })`: requested as `rns/join . <swarm> <lookup>` at
the node, by the mrepo that created it.

## Arguments

1. The swarm's name. Required.
2. The lookup, JSON: `{ uri, machine, folder, key, registry }`, as the
   master's `rns/master` answered it. Required.

## Returns

`{ joined, uri, key, machine, folder }`: the swarm, the node's unique
URI, its key and where it lives: what its creator registers it with
(`register`). Until it is registered its lease is refused, said in its
status.

## Errors

- `missing argument: swarm`, `missing argument: lookup`; a lookup that is
  none: `not a lookup`.
- In a swarm already, another or as its master: `in a swarm already`.
- Its program not running: `rns is not running here`.
