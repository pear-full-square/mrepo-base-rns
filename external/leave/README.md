# leave

Takes a node out of the swarm's lookup db, asked of the master.

## Signature

`leave(exec, { args })`: requested as `rns/leave . <unique URI>` at the
master.

## Arguments

1. The node's unique URI. Required.

## Returns

`{ left }`: its unique URI; `null` when it was not registered.

## Errors

- `missing argument: node`.
- The master itself: `the master does not leave`.
- Asked of a node that is not the master: `not the master`.
