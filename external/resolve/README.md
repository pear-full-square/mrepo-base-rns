# resolve

Answers where a node of the swarm lives, by its unique URI, from the lookup db as this node holds it.

## Signature

`resolve(exec, { args })`: requested as `rns/resolve . <unique URI>`.

## Arguments

1. The node's unique URI: `swarm-1/node-2`. Required.

## Returns

`{ uri, role, state, since, key, machine, folder }`: its role (`master`
or `node`), its state as in `status`, its key, its machine's name and
its folder there.

## Errors

- No URI: `missing argument: node`.
- Not in the lookup db: `not registered: <uri>`, with those that are.
- The node in no swarm: `not in a swarm`.
- Its program not running: `rns is not running here`.
