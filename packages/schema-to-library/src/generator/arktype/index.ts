import { resolveSchemaDependenciesFromSchema } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { toIdentifierPascalCase, toPascalCase } from '../../utils/index.js'
import { arktype } from './arktype.js'

export function schemaToArktype(
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

  // Check if we need scope (definitions exist)
  if (hasDefinitions) {
    const defEntries = orderedSchemas.map((name) => {
      const def = definitions[name]
      if (!def) return `// ⚠️ missing definition for ${name}`
      const pc = toName(name)
      return `${pc}:${arktype(def, pc, true, genOptions)}`
    })

    const scopeEntries = rootInDefs
      ? defEntries
      : [...defEntries, `${rootName}:${arktype(schema, rootName, true, genOptions)}`]

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
  const rootSchema = arktype(schema, rootName, false, genOptions)

  const rootExpr = rootSchema.startsWith('type(')
    ? rootSchema
    : rootSchema.startsWith('"')
      ? `type(${rootSchema})`
      : rootSchema

  // x-allOf-message at the root: emit a sibling `${rootName}Inner` const so
  // the strict schema retains type inference, then wrap with `.narrow()` to
  // override sub-issue messages while preserving paths.
  const allOfMessage = schema.allOf && schema['x-allOf-message']
  if (allOfMessage) {
    const innerName = `${rootName}Inner`
    const isArrow = /^\s*\(.*?\)\s*=>/.test(allOfMessage)
    const msgExpr = isArrow ? `(${allOfMessage})(issue)` : JSON.stringify(allOfMessage)
    const wrapped = `type('unknown').narrow((val, ctx) => {const result = ${innerName}(val); if (result instanceof type.errors) {for (const issue of result) ctx.reject({ message: ${msgExpr}, path: issue.path }); return false;} return true;})`
    return [
      `import { type } from "arktype"`,
      `const ${innerName} = ${rootExpr}`,
      `export const ${rootName} = ${wrapped}`,
      ...(exportType ? [`export type ${rootName} = typeof ${innerName}.infer`] : []),
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  return [
    `import { type } from "arktype"`,
    `export const ${rootName} = ${rootExpr}`,
    ...(exportType ? [`export type ${rootName} = typeof ${rootName}.infer`] : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}
