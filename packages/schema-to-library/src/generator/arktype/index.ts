import {
  findCodeExtensionKeysInSchema,
  resolveSchemaDependenciesFromSchema,
  UNSAFE_GENERATED_MARKER,
} from '../../helper/index.js'
import type { JSONSchema, ParamIn } from '../../parser/index.js'
import { toIdentifierPascalCase, toPascalCase } from '../../utils/index.js'
import { arktype } from './arktype.js'

export function schemaToArktype(
  schema: JSONSchema,
  options?: {
    exportType?: boolean
    openapi?: boolean
    readonly?: boolean
    unsafeCodeExtensions?: boolean
    paramIn?: ParamIn
  },
): string {
  const {
    exportType = true,
    openapi = false,
    readonly: readonlyMode = false,
    unsafeCodeExtensions = false,
    paramIn,
  } = options ?? {}
  const genOptions = {
    openapi,
    readonly: readonlyMode,
    unsafeCodeExtensions,
    ...(paramIn !== undefined && { paramIn }),
  }
  const codeExtensionsPresent =
    unsafeCodeExtensions && findCodeExtensionKeysInSchema(schema).length > 0
  const prefix = codeExtensionsPresent ? [UNSAFE_GENERATED_MARKER] : []
  const toName = openapi ? toIdentifierPascalCase : toPascalCase
  const rootName = schema.title ? toName(schema.title) : 'Schema'

  const definitions: { [k: string]: JSONSchema } = {
    ...schema.definitions,
    ...schema.$defs,
  }

  const hasDefinitions = Object.keys(definitions).length > 0

  const orderedSchemas = hasDefinitions ? resolveSchemaDependenciesFromSchema(schema) : []

  const rootInDefs = definitions[rootName] !== undefined

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

    // Entries may call `type(...)` — `arktypeWrap` reaches for it whenever a
    // bare definition needs a method such as `.describe()` — so the import has
    // to carry it alongside `scope`.
    const scopeBody = `const types = scope({${scopeEntries.join(',')}}).export()`
    const usesType = /\btype\(/.test(scopeBody)

    return [
      ...prefix,
      `import { scope${usesType ? ', type' : ''} } from "arktype"`,
      scopeBody,
      `export const ${rootName} = types.${rootName}`,
      ...(exportType ? [`export type ${rootName} = typeof ${rootName}.infer`] : []),
    ]
      .filter(Boolean)
      .join('\n\n')
  }

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
    const wrapped = `type('unknown').narrow((data, ctx) => {const result = ${innerName}(data); if (result instanceof type.errors) {for (const issue of result) ctx.reject({ message: ${msgExpr}, path: issue.path }); return false;} return true;})`
    return [
      ...prefix,
      `import { type } from "arktype"`,
      `const ${innerName} = ${rootExpr}`,
      `export const ${rootName} = ${wrapped}`,
      ...(exportType ? [`export type ${rootName} = typeof ${innerName}.infer`] : []),
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  return [
    ...prefix,
    `import { type } from "arktype"`,
    `export const ${rootName} = ${rootExpr}`,
    ...(exportType ? [`export type ${rootName} = typeof ${rootName}.infer`] : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}
