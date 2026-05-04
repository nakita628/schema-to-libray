import { resolveSchemaDependenciesFromSchema } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { toIdentifierPascalCase, toPascalCase } from '../../utils/index.js'
import { effect } from './effect.js'
import { type } from './type.js'

/**
 * Detect self-references ($ref: "#") in schema, excluding definitions/$defs
 */
function hasSelfReference(schema: JSONSchema): boolean {
  const isRecord = (v: unknown): v is { [k: string]: unknown } =>
    typeof v === 'object' && v !== null

  const stack: unknown[] = Object.entries(schema)
    .filter(([key]) => key !== 'definitions' && key !== '$defs')
    .map(([, value]) => value)

  while (stack.length > 0) {
    const node = stack.pop()
    if (!isRecord(node)) continue
    if ('$ref' in node && node.$ref === '#') return true
    for (const [key, value] of Object.entries(node)) {
      if (key === 'definitions' || key === '$defs') continue
      if (Array.isArray(value)) {
        for (const item of value) {
          if (isRecord(item)) stack.push(item)
        }
      } else if (isRecord(value)) {
        stack.push(value)
      }
    }
  }

  return false
}

/**
 * Convert JSON Schema to Effect Schema code
 */
export function schemaToEffect(
  schema: JSONSchema,
  options?: { exportType?: boolean; openapi?: boolean; readonly?: boolean },
): string {
  const { exportType = true, openapi = false } = options ?? {}
  const genOptions = { openapi }
  const toName = openapi ? toIdentifierPascalCase : toPascalCase
  const pascalTitle = schema.title ? toName(schema.title) : 'Schema_'
  // Avoid conflict with `import { Schema } from "effect"`
  const rootName = pascalTitle === 'Schema' ? 'Schema_' : pascalTitle

  const definitions: { [k: string]: JSONSchema } = {
    ...schema.definitions,
    ...schema.$defs,
  }

  const hasDefinitions = Object.keys(definitions).length > 0
  const needsTypeDef = hasDefinitions || hasSelfReference(schema)

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

  // Assemble output
  return [
    `import { Schema } from "effect"`,
    typeDefsCode,
    schemaDefsCode,
    rootExport,
    ...(exportType ? [`export type ${rootName}Encoded = typeof ${rootName}.Encoded`] : []),
  ]
    .filter(Boolean)
    .join('\n\n')
}
