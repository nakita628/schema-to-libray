import { resolveSchemaDependenciesFromSchema } from '../../helper/index.js'
import type { JSONSchema } from '../../types/index.js'
import { toPascalCase } from '../../utils/index.js'
import { typebox } from './typebox.js'

export function schemaToTypebox(schema: JSONSchema, options?: { exportType?: boolean }): string {
  const { exportType = true } = options ?? {}
  const rootName = schema.title ? toPascalCase(schema.title) : 'Schema'

  const definitions: Record<string, JSONSchema> = {
    ...(schema.definitions ?? {}),
    ...(schema.$defs ?? {}),
  }

  const hasDefinitions = Object.keys(definitions).length > 0

  const orderedSchemas = hasDefinitions ? resolveSchemaDependenciesFromSchema(schema) : []

  const rootInDefs = definitions[rootName] !== undefined
  const rootDefinition = definitions[rootName]

  const nonRootDefs = rootInDefs
    ? orderedSchemas.filter((name) => name !== rootName)
    : orderedSchemas

  // Generate schema definitions (non-root, non-exported)
  const schemaDefsCode = nonRootDefs
    .map((name) => {
      const def = definitions[name]
      if (!def) return `// ⚠️ missing definition for ${name}`
      const pc = toPascalCase(name)
      return `const ${pc} = ${typebox(def, pc, true)}`
    })
    .join('\n\n')

  // Generate root schema
  const rootSchema = rootInDefs
    ? typebox(rootDefinition, rootName, true)
    : typebox(schema, rootName, true)

  const rootExport = `export const ${rootName} = ${rootSchema}`

  // Assemble output
  return [
    `import { Type, type Static } from '@sinclair/typebox'`,
    schemaDefsCode,
    rootExport,
    ...(exportType ? [`export type ${rootName} = Static<typeof ${rootName}>`] : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}
