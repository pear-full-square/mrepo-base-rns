# program

Serves a node's rns as its own process: its store, its identity, its socket, its lease or the leases it grants.

## Signature

- `serve({ dir, every, now })`: the rns of the mrepo in `dir`, served
  until closed; `every` its tick in milliseconds, `now` its clock.
- `program(argv)`: the same as a program, what `runtime/start` starts:
  `--dir=<the mrepo's folder> --runtime=<pid> --state=<file>`; ended by
  `SIGTERM`, with its runtime, or when the folder is gone.

## Returns

`serve`: `{ socket, key, status(), tick(), close() }`. `program` writes
its state, `{ pid, socket, key, started }`, once it is up.

## Design

- **Each tick** it reads its config (`rns/node.json`): none, it idles.
  The master sweeps its leases: a node whose lease ran out is appended
  `quiet`. A node renews its lease when a third of it has passed, sooner
  after a turn that failed, and replicates the master's topic when it is
  longer than its replica.
- **What it answers on its socket**: `status`, `resolve`, `configure`
  (its config taken up now); the master also `register`, `leave` and
  `renew`, the last only from the key the node was registered with.
  A stream opened on it replicates its store.
- **One at a time**: what writes the topic or reads the config is
  queued.

## Also exported

- `LEASE`: 15000, the lease when the master was given none.
