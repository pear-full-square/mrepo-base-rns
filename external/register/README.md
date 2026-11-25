# register

Registers a node in the swarm's lookup db, asked of the master by the mrepo that created the node.

## Signature

`register(exec, { args })`: requested as `rns/register . <node>` at the
master.

## Arguments

1. The node, JSON: `{ uri, key, machine, folder, by }`, as the node's
   `rns/join` answered it; `by` the unique URI of its creator. Required.

## Returns

`{ registered, already, lease }`: its unique URI; whether it was there
already, by the same key; the lease it holds from now, in milliseconds.

## Errors

- `missing argument: node`; one that is none: `not a node`.
- Registered already by another key: `registered already, by another
  key` (`rns/leave` first).
- Asked of a node that is not the master: `not the master`.
