import type { JSONSchema } from '../../helper/index.js'
import { resolveSchemaDependenciesFromSchema } from '../../helper/index.js'
import { toPascalCase } from '../../utils/index.js'
import { arktype } from './arktype.js'

export function schemaToArktype(schema: JSONSchema, options?: { exportType?: boolean }): string {
  const { exportType = true } = options ?? {}
  const rootName = schema.title ? toPascalCase(schema.title) : 'Schema'

  const definitions: { [k: string]: JSONSchema } = {
    ...(schema.definitions ?? {}),
    ...(schema.$defs ?? {}),
  }

  const hasDefinitions = Object.keys(definitions).length > 0

  const orderedSchemas = hasDefinitions ? resolveSchemaDependenciesFromSchema(schema) : []

  const rootInDefs = definitions[rootName] !== undefined

  // Check if we need scope (definitions exist)
  if (hasDefinitions) {
    const defEntries = orderedSchemas.map((name) => {
      const def = definitions[name]
      if (!def) return `// ⚠️ missing definition for ${name}`
      const pc = toPascalCase(name)
      return `${pc}:${arktype(def, pc, true)}`
    })

    const scopeEntries = rootInDefs
      ? defEntries
      : [...defEntries, `${rootName}:${arktype(schema, rootName, true)}`]

    return [
      `import { scope } from "arktype"`,
      `const types = scope({${scopeEntries.join(',')}}).export()`,
      `export const ${rootName} = types.${rootName}`,
      ...(exportType ? [`export type ${rootName} = typeof ${rootName}.infer`] : []),
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  // Simple schema without definitions
  const rootSchema = arktype(schema, rootName, false)

  const rootExpr = rootSchema.startsWith('type(')
    ? rootSchema
    : rootSchema.startsWith('"')
      ? `type(${rootSchema})`
      : rootSchema

  return [
    `import { type } from "arktype"`,
    `export const ${rootName} = ${rootExpr}`,
    ...(exportType ? [`export type ${rootName} = typeof ${rootName}.infer`] : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}
