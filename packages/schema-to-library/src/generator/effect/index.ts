import { DEFAULT_ROOT_NAME, UNSAFE_GENERATED_MARKER } from '../../constants/index.js'
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
import { effect } from './effect.js'
import { type } from './type.js'

/** The root name when the document has none, or when its title would shadow the import. */
const EFFECT_ROOT_FALLBACK = `${DEFAULT_ROOT_NAME}_`

/**
 * A whole JSON Schema document as an Effect Schema module: imports, `$defs` in
 * dependency order, the root export, and the inferred type.
 *
 * `options.readonly` is accepted for API symmetry and is a no-op: `Schema.Struct` and
 * `Schema.Array` are already readonly at the type level.
 */
export function schemaToEffect(schema: JSONSchema, options?: GenerateOptions): string {
  const exportType = options?.exportType ?? true
  const emitOptions = emitOptionsOf(options)
  const codeExtensionsPresent =
    emitOptions.unsafeCodeExtensions === true && findCodeExtensionKeysInSchema(schema).length > 0
  const toName = schemaNamer(emitOptions.openapi)
  // A root named `Schema` would collide with `import { Schema } from "effect"`.
  const pascalTitle = rootNameOf(schema, toName, EFFECT_ROOT_FALLBACK)
  const plan = planDocument(
    schema,
    pascalTitle === DEFAULT_ROOT_NAME ? EFFECT_ROOT_FALLBACK : pascalTitle,
  )
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

  // A recursive declaration needs an explicit annotation, since the schema is
  // referenced inside its own initializer. `Schema.Schema<T>` constrains only
  // the decoded `Type` — which is what `_X` describes and what the exported
  // type reads — while `Schema.Codec<T>` would also pin `Encoded` to `T` and
  // reject any field carrying a decoding default or other transformation.
  const schemaDefsCode = renderDefinitions(
    plan,
    toName,
    (def, name) =>
      `const ${name}: Schema.Schema<_${name}> = ${effect(def, name, true, emitOptions)}`,
  )

  const rootSchema = effect(plan.root, rootName, true, emitOptions)
  const rootExport = needsTypeDef
    ? `export const ${rootName}: Schema.Schema<_${rootName}> = ${rootSchema}`
    : `export const ${rootName} = ${rootSchema}`

  // `Effect` backs decoding defaults and `SchemaTransformation` backs the
  // string case/boolean conversions; import each only when one is emitted.
  const emitted = `${schemaDefsCode}\n${rootExport}`
  const modules = [
    ...(emitted.includes('Effect.succeed(') ? ['Effect'] : []),
    'Schema',
    ...(emitted.includes('SchemaTransformation.') ? ['SchemaTransformation'] : []),
  ]
  const importLine = `import { ${modules.join(', ')} } from "effect"`

  return [
    ...(codeExtensionsPresent ? [UNSAFE_GENERATED_MARKER] : []),
    importLine,
    typeDefsCode,
    schemaDefsCode,
    rootExport,
    ...(exportType ? [`export type ${rootName} = typeof ${rootName}.Type`] : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}
