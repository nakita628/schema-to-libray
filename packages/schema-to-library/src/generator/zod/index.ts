import { UNSAFE_GENERATED_MARKER } from '../../constants/index.js'
import {
  emitOptionsOf,
  findCodeExtensionKeysInSchema,
  hasRootSelfReference,
  planDocument,
  renderDefinitions,
  rootNameOf,
  schemaNamer,
} from '../../helper/index.js'
import type { GenerateOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { type } from './type.js'
import { zod } from './zod.js'

/**
 * A whole JSON Schema document as a Zod module: imports, `$defs` in dependency order,
 * the root export, and the inferred type.
 */
export function schemaToZod(schema: JSONSchema, options?: GenerateOptions): string {
  const exportType = options?.exportType ?? true
  const emitOptions = emitOptionsOf(options)
  const codeExtensionsPresent =
    emitOptions.unsafeCodeExtensions === true && findCodeExtensionKeysInSchema(schema).length > 0
  const toName = schemaNamer(emitOptions.openapi)
  const plan = planDocument(schema, rootNameOf(schema, toName))
  const { rootName } = plan
  const needsTypeDef = plan.hasDefinitions || hasRootSelfReference(schema)

  const typeDefsCode = needsTypeDef
    ? [
        `type _${rootName} = ${type(plan.root, rootName)}`,
        renderDefinitions(plan, toName, (def, name) => `type _${name} = ${type(def, name)}`),
      ]
        .filter(Boolean)
        .join('\n\n')
    : ''

  const schemaDefsCode = renderDefinitions(
    plan,
    toName,
    (def, name) => `const ${name}: z.ZodType<_${name}> = ${zod(def, name, true, emitOptions)}`,
  )

  const rootSchema = zod(plan.root, rootName, true, emitOptions)
  const rootExport = needsTypeDef
    ? `export const ${rootName}: z.ZodType<_${rootName}> = ${rootSchema}`
    : `export const ${rootName} = ${rootSchema}`

  return [
    ...(codeExtensionsPresent ? [UNSAFE_GENERATED_MARKER] : []),
    `import * as z from 'zod'`,
    typeDefsCode,
    schemaDefsCode,
    rootExport,
    ...(exportType ? [`export type ${rootName} = z.infer<typeof ${rootName}>`] : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}
