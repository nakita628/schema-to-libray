import type { JSONSchema } from '../parser/index.js'
import { isRecord } from './value.js'

function collectRefs(definition: JSONSchema): string[] {
  const refs = new Set<string>()
  const stack = [definition]

  while (stack.length > 0) {
    const node = stack.pop()
    if (!isRecord(node)) continue

    if ('$ref' in node && typeof node.$ref === 'string') {
      const ref = node.$ref
      if (ref === '#') continue

      const match = ref.match(/^#\/(?:definitions|\$defs)\/([^/]+)$/)
      if (match) {
        refs.add(match[1])
      }

      const relativeMatch = ref.match(/^#([^/]+)$/)
      if (relativeMatch) {
        refs.add(relativeMatch[1])
      }

      if (ref.includes('#')) {
        const [, fragment] = ref.split('#')
        if (fragment) {
          const fragmentMatch = fragment.match(/^\/(?:definitions|\$defs)\/([^/]+)$/)
          if (fragmentMatch) {
            refs.add(fragmentMatch[1])
          }
          const simpleMatch = fragment.match(/^\/([^/]+)$/)
          if (simpleMatch) {
            refs.add(simpleMatch[1])
          }
        }
        continue
      }
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (isRecord(item)) stack.push(item)
        }
      } else if (isRecord(value)) {
        stack.push(value)
      }
    }
  }

  return [...refs].toSorted()
}

/**
 * Resolve schema dependencies and return them in topological order
 *
 * @param schema - JSON Schema object containing definitions or $defs
 * @returns Array of schema names in dependency order
 * @example
 * ```ts
 * const schema = {
 *   $defs: {
 *     animal: { type: 'object', properties: { name: { type: 'string' } } },
 *     zoo: { type: 'object', properties: { animals: { $ref: '#/$defs/animal' } } }
 *   }
 * }
 * resolveSchemaDependenciesFromSchema(schema) // ['animal', 'zoo']
 * ```
 */
export function resolveSchemaDependenciesFromSchema(schema: JSONSchema): string[] {
  const definitions: { [k: string]: JSONSchema } = {
    ...schema.definitions,
    ...schema.$defs,
  }

  const sorted: string[] = []
  const perm = new Set<string>()
  const temp = new Set<string>()

  const visit = (name: string): void => {
    if (perm.has(name)) return
    if (temp.has(name)) {
      return
    }

    const definition = definitions[name]
    if (!definition) return

    temp.add(name)
    for (const ref of collectRefs(definition)) {
      if (ref in definitions) visit(ref)
    }
    temp.delete(name)

    perm.add(name)
    sorted.push(name)
  }

  for (const name of Object.keys(definitions).toSorted()) {
    visit(name)
  }

  return sorted
}
