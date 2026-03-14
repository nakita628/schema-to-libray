import type { JSONSchema } from '../../helper/index.js'
import { resolveSchemaDependenciesFromSchema } from '../../helper/index.js'
import { toPascalCase } from '../../utils/index.js'
import { type } from './type.js'
import { valibot } from './valibot.js'

/**
 * Detect self-references ($ref: "#") in schema, excluding definitions/$defs
 */
function hasSelfReference(schema: JSONSchema): boolean {
  const isRecord = (v: unknown): v is { [k: string]: unknown } =>
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
 * Convert JSON Schema to Valibot schema code
 */
export function schemaToValibot(schema: JSONSchema, options?: { exportType?: boolean }): string {
  const { exportType = true } = options ?? {}
  const rootName = schema.title ? toPascalCase(schema.title) : 'Schema'

  const definitions: { [k: string]: JSONSchema } = {
    ...(schema.definitions ?? {}),
    ...(schema.$defs ?? {}),
  }

  const hasDefinitions = Object.keys(definitions).length > 0
  const needsTypeDef = hasDefinitions || hasSelfReference(schema)

  const orderedSchemas = hasDefinitions ? resolveSchemaDependenciesFromSchema(schema) : []

  const rootInDefs = definitions[rootName] !== undefined
  const rootDefinition = definitions[rootName]

  const nonRootDefs = rootInDefs
    ? orderedSchemas.filter((name) => name !== rootName)
    : orderedSchemas

  // Generate type definitions
  const typeDefsCode = needsTypeDef
    ? (() => {
        const rootTypeDef = `type ${rootName}Type = ${type(rootDefinition ?? schema, rootName)}`
        const otherTypeDefs = nonRootDefs.map((name) => {
          const def = definitions[name]
          if (!def) return `// ⚠️ missing definition for ${name}`
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
      if (!def) return `// ⚠️ missing definition for ${name}`
      const pc = toPascalCase(name)
      return `const ${pc}: v.GenericSchema<${pc}Type> = ${valibot(def, pc, true)}`
    })
    .join('\n\n')

  // Generate root schema
  const rootSchema = rootInDefs
    ? valibot(rootDefinition, rootName, true)
    : valibot(schema, rootName, true)

  const rootExport = needsTypeDef
    ? `export const ${rootName}: v.GenericSchema<${rootName}Type> = ${rootSchema}`
    : `export const ${rootName} = ${rootSchema}`

  // Assemble output
  return [
    `import * as v from 'valibot'`,
    typeDefsCode,
    schemaDefsCode,
    rootExport,
    ...(exportType
      ? [
          `export type ${rootName}Input = v.InferInput<typeof ${rootName}>`,
          `export type ${rootName}Output = v.InferOutput<typeof ${rootName}>`,
        ]
      : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}
