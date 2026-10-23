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
import { valibot } from './valibot.js'

/**
 * A recursive declaration needs an explicit annotation, since the schema is referenced
 * inside its own initializer. `GenericSchema<TInput, TOutput>` pins the input to the
 * output when given a single argument, which rejects any schema whose input differs — a
 * field with a `default`, say — so only the output is constrained here. `_X` describes
 * the output, which is what `v.InferOutput` reads.
 */
function annotation(name: string) {
  return `v.GenericSchema<unknown, _${name}>`
}

/**
 * A whole JSON Schema document as a Valibot module: imports, `$defs` in dependency
 * order, the root export, and the inferred output type.
 */
export function schemaToValibot(schema: JSONSchema, options?: GenerateOptions): string {
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
    (def, name) => `const ${name}: ${annotation(name)} = ${valibot(def, name, true, emitOptions)}`,
  )

  const rootSchema = valibot(plan.root, rootName, true, emitOptions)
  const rootExport = needsTypeDef
    ? `export const ${rootName}: ${annotation(rootName)} = ${rootSchema}`
    : `export const ${rootName} = ${rootSchema}`

  return [
    ...(codeExtensionsPresent ? [UNSAFE_GENERATED_MARKER] : []),
    `import * as v from 'valibot'`,
    typeDefsCode,
    schemaDefsCode,
    rootExport,
    ...(exportType ? [`export type ${rootName}Output = v.InferOutput<typeof ${rootName}>`] : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}
