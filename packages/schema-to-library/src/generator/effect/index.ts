import {
  findCodeExtensionKeysInSchema,
  hasRootSelfReference,
  resolveSchemaDependenciesFromSchema,
  UNSAFE_GENERATED_MARKER,
} from '../../helper/index.js'
import type { JSONSchema, ParamIn } from '../../parser/index.js'
import { toIdentifierPascalCase, toPascalCase } from '../../utils/index.js'
import { effect } from './effect.js'
import { type } from './type.js'

/**
 * Convert JSON Schema to Effect Schema code
 */
export function schemaToEffect(
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
    unsafeCodeExtensions = false,
    paramIn,
  } = options ?? {}
  const genOptions = {
    openapi,
    unsafeCodeExtensions,
    ...(paramIn !== undefined && { paramIn }),
  }
  const codeExtensionsPresent =
    unsafeCodeExtensions && findCodeExtensionKeysInSchema(schema).length > 0
  const toName = openapi ? toIdentifierPascalCase : toPascalCase
  const pascalTitle = schema.title ? toName(schema.title) : 'Schema_'
  // Avoid conflict with `import { Schema } from "effect"`
  const rootName = pascalTitle === 'Schema' ? 'Schema_' : pascalTitle

  const definitions: { [k: string]: JSONSchema } = {
    ...schema.definitions,
    ...schema.$defs,
  }

  const hasDefinitions = Object.keys(definitions).length > 0
  const needsTypeDef = hasDefinitions || hasRootSelfReference(schema)

  const orderedSchemas = hasDefinitions ? resolveSchemaDependenciesFromSchema(schema) : []

  const rootInDefs = definitions[rootName] !== undefined
  const rootDefinition = definitions[rootName]

  const nonRootDefs = rootInDefs
    ? orderedSchemas.filter((name) => name !== rootName)
    : orderedSchemas

  // Generate type definitions
  const typeDefsCode = needsTypeDef
    ? (() => {
        const rootTypeDef = `type _${rootName} = ${type(rootDefinition ?? schema, rootName)}`
        const otherTypeDefs = nonRootDefs.map((name) => {
          const def = definitions[name]
          if (!def) return `// ⚠️ missing definition for ${name}`
          const pc = toName(name)
          return `type _${pc} = ${type(def, pc)}`
        })
        return [rootTypeDef, ...otherTypeDefs].join('\n\n')
      })()
    : ''

  // A recursive declaration needs an explicit annotation, since the schema is
  // referenced inside its own initializer. `Schema.Schema<T>` constrains only
  // the decoded `Type` — which is what `_X` describes and what the exported
  // type reads — while `Schema.Codec<T>` would also pin `Encoded` to `T` and
  // reject any field carrying a decoding default or other transformation.
  // Generate schema definitions (non-root, non-exported)
  const schemaDefsCode = nonRootDefs
    .map((name) => {
      const def = definitions[name]
      if (!def) return `// ⚠️ missing definition for ${name}`
      const pc = toName(name)
      return `const ${pc}: Schema.Schema<_${pc}> = ${effect(def, pc, true, genOptions)}`
    })
    .join('\n\n')

  // Generate root schema
  const rootSchema = rootInDefs
    ? effect(rootDefinition, rootName, true, genOptions)
    : effect(schema, rootName, true, genOptions)

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

  // Assemble output
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
