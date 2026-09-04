import {
  cyclicDefinitionNames,
  hasNotKeyword,
  hasRootSelfReference,
  NOT_KEYWORD_UNSUPPORTED_MARKER,
  resolveSchemaDependenciesFromSchema,
} from '../../helper/index.js'
import type { JSONSchema, ParamIn } from '../../parser/index.js'
import { resolveOpenAPIRef, toIdentifierPascalCase, toPascalCase } from '../../utils/index.js'
import { typebox } from './typebox.js'

export function schemaToTypebox(
  schema: JSONSchema,
  options?: {
    exportType?: boolean
    openapi?: boolean
    readonly?: boolean
    paramIn?: ParamIn
  },
): string {
  const {
    exportType = true,
    openapi = false,
    readonly: readonlyMode = false,
    paramIn,
  } = options ?? {}
  const genOptions = {
    openapi,
    readonly: readonlyMode,
    ...(paramIn !== undefined && { paramIn }),
  }
  const notKeywordPresent = hasNotKeyword(schema)
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

  // A `$ref` cycle cannot be expressed with plain `const` declarations: the
  // first one would reference a peer declared later. TypeBox v1 answers this
  // with `Type.Cyclic($defs, root)`, where members refer to each other by name
  // through `Type.Ref`. Once any cycle is present every definition moves into
  // that one map, so a non-cyclic definition referencing a cyclic one still
  // resolves.
  const rootSelfReferential = hasRootSelfReference(
    rootInDefs ? rootDefinition : schema,
    (ref) => ref === '#' || ref === '' || (openapi && resolveOpenAPIRef(ref) === rootName),
  )
  const cyclicDefs = cyclicDefinitionNames(schema)
  const isCyclic = rootSelfReferential || cyclicDefs.size > 0

  if (isCyclic) {
    const cyclicRefs = new Set([...orderedSchemas.map(toName), rootName])
    const cyclicOptions = { ...genOptions, cyclicRefs }
    const members = [
      ...nonRootDefs.map((name) => {
        const def = definitions[name]
        const pc = toName(name)
        return def
          ? `${pc}: ${typebox(def, pc, true, cyclicOptions)}`
          : `// ⚠️ missing definition for ${name}`
      }),
      `${rootName}: ${typebox(rootInDefs ? rootDefinition : schema, rootName, true, cyclicOptions)}`,
    ].join(',\n')

    const cyclicExport = `export const ${rootName} = Type.Cyclic({\n${members}\n},'${rootName}')`

    return [
      ...(notKeywordPresent ? [NOT_KEYWORD_UNSUPPORTED_MARKER] : []),
      `import { ${cyclicExport.includes('Codec(') ? 'Codec, ' : ''}Type, type Static } from 'typebox'`,
      cyclicExport,
      ...(exportType ? [`export type ${rootName} = Static<typeof ${rootName}>`] : []),
    ]
      .filter(Boolean)
      .join('\n\n')
  }

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

  // `Codec(...)` (string-wire coercion / transform) is a separate named export
  // from `typebox`; import it only when the generated code emitted one.
  const usesCodec = `${schemaDefsCode}\n${rootExport}`.includes('Codec(')

  // Assemble output
  return [
    ...(notKeywordPresent ? [NOT_KEYWORD_UNSUPPORTED_MARKER] : []),
    `import { ${usesCodec ? 'Codec, ' : ''}Type, type Static } from 'typebox'`,
    schemaDefsCode,
    rootExport,
    ...(exportType ? [`export type ${rootName} = Static<typeof ${rootName}>`] : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}
