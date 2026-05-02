import { resolveSchemaDependenciesFromSchema } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { toIdentifierPascalCase, toPascalCase } from '../../utils/index.js'
import { typebox } from './typebox.js'

export function schemaToTypebox(
  schema: JSONSchema,
  options?: { exportType?: boolean; openapi?: boolean; readonly?: boolean },
): string {
  const { exportType = true, openapi = false, readonly: readonlyMode = false } = options ?? {}
  const genOptions = { openapi, readonly: readonlyMode }
  const toName = openapi ? toIdentifierPascalCase : toPascalCase
  const rootName = schema.title ? toName(schema.title) : 'Schema'

  const definitions: { [k: string]: JSONSchema } = {
    ...schema.definitions,
    ...schema.$defs,
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
      const pc = toName(name)
      return `const ${pc} = ${typebox(def, pc, true, genOptions)}`
    })
    .join('\n\n')

  // Generate root schema
  const rootSchema = rootInDefs
    ? typebox(rootDefinition, rootName, true, genOptions)
    : typebox(schema, rootName, true, genOptions)

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
