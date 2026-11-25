# client

Asks the node's rns, its program, over its socket in the mrepo's folder; reads and writes its config.

## Signature

- `ask(dir, body, { timeout })`: the program of the mrepo in `dir`
  asked, `{ op, ... }`.
- `lookup(dir)`: the lookup db as another module reads it:
  `resolve(uri)`, `status()`.
- `configOf(dir)`, `configure(dir, config)`: its config, `rns/node.json`.

## Returns

`ask`: the program's answer. `configOf`: the config, `null` when there is
none.

## Errors

- No program behind the socket: `rns is not running here`, with how it is
  started.
- What the program refused, as it said it.

## Also exported

- `SIDE`: `rns`, its side of the mrepo's folder; `SOCKET`, `CONFIG`: its
  socket's and its config's names there.
