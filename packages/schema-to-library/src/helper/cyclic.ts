import type { JSONSchema } from '../parser/index.js'

const isRecord = (v: unknown): v is { [k: string]: unknown } =>
  typeof v === 'object' && v !== null

/**
 * Collect the local definition names a schema refers to, following every
 * `$ref` form the generators understand (`#/definitions/X`, `#/$defs/X` and
 * the bare `#X` shorthand). Nested `definitions`/`$defs` are not traversed:
 * only references reachable from the schema body count as edges.
 */
function collectLocalRefs(schema: JSONSchema): readonly string[] {
  const refs = new Set<string>()
  const stack: unknown[] = [schema]

  while (stack.length > 0) {
    const node = stack.pop()
    if (!isRecord(node)) continue

    if (typeof node.$ref === 'string') {
      const match = node.$ref.match(/^#\/(?:definitions|\$defs)\/([^/]+)$/)
      if (match?.[1] !== undefined) refs.add(match[1])
      const shorthand = node.$ref.match(/^#([^/]+)$/)
      if (shorthand?.[1] !== undefined) refs.add(shorthand[1])
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === 'definitions' || key === '$defs') continue
      if (Array.isArray(value)) {
        for (const item of value) if (isRecord(item)) stack.push(item)
      } else if (isRecord(value)) {
        stack.push(value)
      }
    }
  }

  return [...refs]
}

/**
 * True when a schema body refers back to itself, ignoring anything nested
 * under `definitions`/`$defs`.
 *
 * By default only a whole-document reference (`$ref: "#"` or `""`) counts.
 * Pass `isSelfRef` to also recognise a named reference that resolves back to
 * the schema being emitted — an OpenAPI component referencing its own
 * `#/components/schemas/...` entry, for instance.
 */
export function hasRootSelfReference(
  schema: JSONSchema,
  isSelfRef: (ref: string) => boolean = (ref) => ref === '#' || ref === '',
): boolean {
  const stack: unknown[] = Object.entries(schema)
    .filter(([key]) => key !== 'definitions' && key !== '$defs')
    .map(([, value]) => value)

  while (stack.length > 0) {
    const node = stack.pop()
    if (!isRecord(node)) continue
    if (typeof node.$ref === 'string' && isSelfRef(node.$ref)) return true
    for (const [key, value] of Object.entries(node)) {
      if (key === 'definitions' || key === '$defs') continue
      if (Array.isArray(value)) {
        for (const item of value) if (isRecord(item)) stack.push(item)
      } else if (isRecord(value)) {
        stack.push(value)
      }
    }
  }

  return false
}

/**
 * Names of the local definitions that take part in a `$ref` cycle — either a
 * self loop (`A -> A`) or a mutual one (`A -> B -> A`).
 *
 * Generators that cannot express a cycle with plain `const` declarations (a
 * later definition would be referenced before initialisation) use this to
 * switch those definitions over to a by-name construct instead.
 *
 * @example
 * ```ts
 * cyclicDefinitionNames({
 *   $defs: {
 *     A: { properties: { b: { $ref: '#/$defs/B' } } },
 *     B: { properties: { a: { $ref: '#/$defs/A' } } },
 *   },
 * }) // Set { 'A', 'B' }
 * ```
 */
export function cyclicDefinitionNames(schema: JSONSchema): ReadonlySet<string> {
  const definitions: { [k: string]: JSONSchema } = {
    ...schema.definitions,
    ...schema.$defs,
  }

  const edges = new Map<string, readonly string[]>()
  for (const [name, def] of Object.entries(definitions)) {
    edges.set(
      name,
      collectLocalRefs(def).filter((ref) => ref in definitions),
    )
  }

  // Iterative DFS over the reference graph; every name still on the current
  // path when an edge loops back to it is part of that cycle.
  const cyclic = new Set<string>()
  const state = new Map<string, 'visiting' | 'done'>()
  const path: string[] = []

  const visit = (start: string): void => {
    // Each frame is `[name, leaving]`; the `leaving` frame is pushed before the
    // children so it pops once the whole subtree is done.
    const work: [string, boolean][] = [[start, false]]
    while (work.length > 0) {
      const entry = work.pop()
      if (entry === undefined) continue
      const [name, leaving] = entry
      if (leaving) {
        path.pop()
        state.set(name, 'done')
        continue
      }
      if (state.get(name) === 'done') continue
      if (state.get(name) === 'visiting') {
        // Back edge: everything from `name` to the top of the path is cyclic.
        for (let i = path.lastIndexOf(name); i >= 0 && i < path.length; i++) {
          const onCycle = path[i]
          if (onCycle !== undefined) cyclic.add(onCycle)
        }
        continue
      }
      state.set(name, 'visiting')
      path.push(name)
      work.push([name, true])
      for (const next of edges.get(name) ?? []) work.push([next, false])
    }
  }

  for (const name of Object.keys(definitions).sort()) visit(name)

  return cyclic
}
