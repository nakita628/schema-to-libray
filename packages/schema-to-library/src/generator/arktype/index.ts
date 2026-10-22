import { UNSAFE_GENERATED_MARKER } from '../../constants/index.js'
import {
  emitOptionsOf,
  findCodeExtensionKeysInSchema,
  missingDefinitionComment,
  planDocument,
  rootNameOf,
  schemaNamer,
} from '../../helper/index.js'
import type { GenerateOptions } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { issueMessageExpression } from '../../utils/index.js'
import { arktype } from './arktype.js'

/**
 * A whole JSON Schema document as an ArkType module. A document with definitions becomes
 * a `scope({...}).export()` so members can name one another; one without is a bare
 * `type(...)` export.
 */
export function schemaToArktype(schema: JSONSchema, options?: GenerateOptions): string {
  const exportType = options?.exportType ?? true
  const emitOptions = emitOptionsOf(options)
  const codeExtensionsPresent =
    emitOptions.unsafeCodeExtensions === true && findCodeExtensionKeysInSchema(schema).length > 0
  const prefix = codeExtensionsPresent ? [UNSAFE_GENERATED_MARKER] : []
  const toName = schemaNamer(emitOptions.openapi)
  const plan = planDocument(schema, rootNameOf(schema, toName))
  const { rootName } = plan

  if (plan.hasDefinitions) {
    const defEntries = plan.orderedNames.map((name) => {
      const def = plan.definitions[name]
      if (!def) return missingDefinitionComment(name)
      const pc = toName(name)
      return `${pc}:${arktype(def, pc, true, emitOptions)}`
    })

    const scopeEntries =
      plan.rootDefinition === undefined
        ? [...defEntries, `${rootName}:${arktype(schema, rootName, true, emitOptions)}`]
        : defEntries

    // Entries may call `type(...)` — `arktypeWrap` reaches for it whenever a
    // bare definition needs a method such as `.describe()` — or read `type.errors`
    // in a wire union, so the import has to carry it alongside `scope`.
    const scopeBody = `const types = scope({${scopeEntries.join(',')}}).export()`
    const usesType = /\btype[(.]/u.test(scopeBody)

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

  const rootSchema = arktype(schema, rootName, false, emitOptions)

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
    const msgExpr = issueMessageExpression(allOfMessage)
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
