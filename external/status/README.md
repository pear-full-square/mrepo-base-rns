# status

Answers the swarm as this node's lookup db has it: the nodes registered and whether each is active.

## Signature

`status(exec)`: requested as `rns/status`, or `rns` alone, at the node.

## Returns

`{ running, key, machine, folder, joined, swarm, uri, role, master,
lease, registry: { key, length }, synced, error, nodes }`: `key` the
node's own; `lease` in milliseconds; `synced` when a node's replica was
last brought up to date, `error` why its last turn failed (a node only);
`nodes` a list, the master first, each `{ uri, role, state, since,
machine }`.

- `state`: `registered` (no lease renewed yet), `active`, `quiet` (its
  lease ran out, `since` when).
- In no swarm: `{ running: true, joined: false, nodes: [] }` with its
  key and where it lives.
- Its program not running: `{ running: false, joined: false, nodes: [] }`.

## Errors

None of its own: a node in no swarm and a program not running are
answered, not refused. Behind the node's service: asked of a node not
started, the door refuses it.
