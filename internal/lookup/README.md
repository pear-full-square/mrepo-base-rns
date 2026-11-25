# lookup

Folds a swarm's lookup db from its records: the nodes registered, each with its state.

## Signature

- `fold(records, nodes)`: the records applied in order, onto the nodes
  so far (a `Map` by unique URI, empty when none is given).
- `apply(nodes, record)`: one record.
- `view(nodes)`: the nodes as a list, the master first, then by URI.

## Returns

A node: `{ uri, role, key, where: { machine, folder }, by, registered,
state, since }`.

## Design

The records, a topic's values:

| record | the node then |
|---|---|
| `{ op: 'register', uri, role, key, where, by }` | there, `registered`; the master `active` |
| `{ op: 'active', uri }` | `active`, since the record |
| `{ op: 'quiet', uri, since }` | `quiet`, since its lease ran out |
| `{ op: 'leave', uri }` | gone |

A record about a node that is not there changes nothing.

## Also exported

- `STATES`: `registered`, `active`, `quiet`.
