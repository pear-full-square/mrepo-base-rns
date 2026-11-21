// lookup: a swarm's lookup db folded from its records (README.md beside it).
// The records, a topic's values, in order:
//   { op: 'register', uri, role, key, where: { machine, folder }, by }
//   { op: 'active', uri }            its lease renewed after none, or the first time
//   { op: 'quiet', uri, since }      its lease ran out
//   { op: 'leave', uri }             taken out
export const STATES = ['registered', 'active', 'quiet']

// One record applied to the nodes so far (a Map by URI): what changed.
export function apply (nodes, { value, timestamp = null }) {
  const node = nodes.get(value?.uri)
  switch (value?.op) {
    case 'register':
      // (the master holds no lease: active while it is the master)
      nodes.set(value.uri, { uri: value.uri, role: value.role ?? 'node', key: value.key ?? null, where: value.where ?? null, by: value.by ?? null, registered: timestamp, state: value.role === 'master' ? 'active' : 'registered', since: timestamp })
      break
    case 'active':
      if (node) nodes.set(node.uri, { ...node, state: 'active', since: timestamp })
      break
    case 'quiet':
      if (node) nodes.set(node.uri, { ...node, state: 'quiet', since: value.since ?? timestamp })
      break
    case 'leave':
      nodes.delete(value.uri)
      break
  }
  return nodes
}

// The records folded: the nodes registered, by URI.
export const fold = (records, nodes = new Map()) => records.reduce(apply, nodes)

// The nodes as they are answered: by URI, the master first.
export const view = nodes => [...nodes.values()].sort((a, b) => (a.role === b.role ? a.uri.localeCompare(b.uri) : a.role === 'master' ? -1 : 1))
