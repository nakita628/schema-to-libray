import type { Schema } from '@schema-to-library/cli'

export function resolveSchemaDependenciesFromSchema(schema: Schema): string[] {
  // Merge both definitions and $defs
  const definitions: Record<string, Schema> = {
    ...(schema.definitions ?? {}),
    ...(schema.$defs ?? {}),
  }

  const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

  const collectRefs = (schema: Schema): string[] => {
    const refs = new Set<string>()
    const stack = [schema]

    while (stack.length > 0) {
      const node = stack.pop()
      if (!isRecord(node)) continue

      if ('$ref' in node && typeof node.$ref === 'string') {
        const ref = node.$ref
        if (ref === '#') continue

        // Check for both definitions and $defs refs
        const match = ref.match(/^#\/(?:definitions|\$defs)\/([^/]+)$/)
        if (match) {
          refs.add(match[1])
        }

        // Check for relative references like #node
        const relativeMatch = ref.match(/^#([^/]+)$/)
        if (relativeMatch) {
          refs.add(relativeMatch[1])
        }

        // Check for external file references with fragments
        if (ref.includes('#')) {
          const [filePath, fragment] = ref.split('#')
          if (fragment) {
            // Extract the schema name from the fragment
            const fragmentMatch = fragment.match(/^\/(?:definitions|\$defs)\/([^/]+)$/)
            if (fragmentMatch) {
              refs.add(fragmentMatch[1])
            }
            // Handle simple fragment like "#node"
            const simpleMatch = fragment.match(/^\/([^/]+)$/)
            if (simpleMatch) {
              refs.add(simpleMatch[1])
            }
          }
          // Skip external references that we can't resolve
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

    return Array.from(refs).sort()
  }

  const sorted: string[] = []
  const perm = new Set<string>()
  const temp = new Set<string>()

  const visit = (name: string): void => {
    if (perm.has(name)) return
    if (temp.has(name)) {
      // Circular dependency detected - skip this dependency but continue processing
      // console.warn(`Warning: Circular dependency detected for type "${name}", skipping...`)
      return
    }

    const schema = definitions[name]
    if (!schema) return

    temp.add(name)
    for (const ref of collectRefs(schema)) {
      if (ref in definitions) visit(ref)
    }
    temp.delete(name)

    perm.add(name)
    sorted.push(name)
  }

  for (const name of Object.keys(definitions).sort()) {
    visit(name)
  }

  return sorted
}
