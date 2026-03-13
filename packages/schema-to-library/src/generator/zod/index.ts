import type { JSONSchema } from '../../types/index.js'
import { toPascalCase } from '../../utils/index.js'
import { resolveSchemaDependenciesFromSchema } from '../../helper/index.js'
import { type } from './type.js'
import { zod } from './zod.js'

/**
 * Detect self-references ($ref: "#") in schema, excluding definitions/$defs
 */
function hasSelfReference(schema: JSONSchema): boolean {
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null

  const stack: unknown[] = Object.entries(schema)
    .filter(([key]) => key !== 'definitions' && key !== '$defs')
    .map(([, value]) => value)

  while (stack.length > 0) {
    const node = stack.pop()
    if (!isRecord(node)) continue
    if ('$ref' in node && node.$ref === '#') return true
    for (const [key, value] of Object.entries(node)) {
      if (key === 'definitions' || key === '$defs') continue
      if (Array.isArray(value)) {
        for (const item of value) {
          if (isRecord(item)) stack.push(item)
        }
      } else if (isRecord(value)) {
        stack.push(value)
      }
    }
  }

  return false
}

/**
 * Convert JSON Schema to Zod schema code
 *
 * @param schema - JSON Schema object to convert
 * @returns Generated TypeScript/Zod code string
 * @example
 * ```ts
 * const schema = {
 *   type: 'object',
 *   properties: { name: { type: 'string' } },
 *   required: ['name']
 * }
 * schemaToZod(schema) // Generated Zod code
 * ```
 */
export function schemaToZod(schema: JSONSchema): string {
  const rootName = schema.title ? toPascalCase(schema.title) : 'Schema'

  const definitions: Record<string, JSONSchema> = {
    ...(schema.definitions ?? {}),
    ...(schema.$defs ?? {}),
  }

  const hasDefinitions = Object.keys(definitions).length > 0
  const needsTypeDef = hasDefinitions || hasSelfReference(schema)

  // Resolve dependency order once
  const orderedSchemas = hasDefinitions
    ? resolveSchemaDependenciesFromSchema(schema)
    : []

  // Check if root schema is defined in definitions
  const rootInDefs = definitions[rootName] !== undefined
  const rootDefinition = definitions[rootName]

  // Non-root definitions (filtered and ordered)
  const nonRootDefs = rootInDefs
    ? orderedSchemas.filter((name) => name !== rootName)
    : orderedSchemas

  // Generate type definitions
  const typeDefsCode = needsTypeDef
    ? (() => {
        const rootTypeDef = `type ${rootName}Type = ${type(rootDefinition ?? schema, rootName)}`
        const otherTypeDefs = nonRootDefs.map((name) => {
          const def = definitions[name]
          if (!def) return `// \u26a0\ufe0f missing definition for ${name}`
          const pc = toPascalCase(name)
          return `type ${pc}Type = ${type(def, pc)}`
        })
        return [rootTypeDef, ...otherTypeDefs].join('\n\n')
      })()
    : ''

  // Generate schema definitions (non-root, non-exported)
  const schemaDefsCode = nonRootDefs
    .map((name) => {
      const def = definitions[name]
      if (!def) return `// \u26a0\ufe0f missing definition for ${name}`
      const pc = toPascalCase(name)
      return `const ${pc}: z.ZodType<${pc}Type> = ${zod(def, pc, true)}`
    })
    .join('\n\n')

  // Generate root schema
  const rootSchema = rootInDefs
    ? zod(rootDefinition, rootName, true)
    : zod(schema, rootName, true)

  const rootExport = needsTypeDef
    ? `export const ${rootName}: z.ZodType<${rootName}Type> = ${rootSchema}`
    : `export const ${rootName} = ${rootSchema}`

  // Assemble output
  return [
    `import * as z from 'zod'`,
    typeDefsCode,
    schemaDefsCode,
    rootExport,
    `export type ${rootName} = z.infer<typeof ${rootName}>`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
