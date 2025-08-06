import type { Schema } from '../cli/index.js'
import { resolveSchemaDependenciesFromSchema, toPascalCase, type } from '../helper/index.js'
import zod from './zod/index.js'

export function schemaToZod(schema: Schema): string {
  // Get the root schema name from title or use default
  const rootName = schema.title ? toPascalCase(schema.title) : 'Schema'

  // Check if there are any definitions or $defs
  const definitions = {
    ...(schema.definitions ?? {}),
    ...(schema.$defs ?? {}),
  }

  // Check if there are any self-references in definitions
  const selfReferencingTypes = Object.entries(definitions).filter(([name, def]) => {
    const defStr = JSON.stringify(def)
    return (
      defStr.includes(`"$ref":"#/definitions/${name}"`) ||
      defStr.includes(`"$ref":"#/$defs/${name}"`) ||
      defStr.includes(`"$ref":"#${name}"`)
    )
  })

  // Check if the root schema has a $ref
  const hasRootRef = schema.$ref !== undefined

  // If there are self-referencing types or root has $ref, generate the root schema with all dependencies
  if (
    selfReferencingTypes.length > 0 ||
    hasRootRef ||
    (Object.keys(definitions).length > 0 && definitions[rootName])
  ) {
    // Generate type definitions for all referenced types first
    const typeDefinitions =
      Object.keys(definitions).length > 0
        ? (() => {
            // resolve dependencies and determine order
            const orderedSchemas = resolveSchemaDependenciesFromSchema(schema)
            return orderedSchemas
              .map((name: string) => {
                const def = definitions[name]
                if (!def) return `// ⚠️ missing definition for ${name}`
                const pascalCaseName = toPascalCase(name)
                const typeDef = type(def, pascalCaseName)
                return `type ${pascalCaseName}Type = ${typeDef}`
              })
              .filter((_, index) => {
                // Exclude root schema type definition if it exists in definitions
                const rootDefinition = definitions[rootName]
                if (rootDefinition) {
                  const orderedSchemas = resolveSchemaDependenciesFromSchema(schema)
                  const rootIndex = orderedSchemas.indexOf(rootName)
                  return index !== rootIndex
                }
                return true
              })
              .join('\n\n')
          })()
        : ''

    // Generate schema definitions for all referenced types (not exported)
    const schemaDefinitions =
      Object.keys(definitions).length > 0
        ? (() => {
            // resolve dependencies and determine order
            const orderedSchemas = resolveSchemaDependenciesFromSchema(schema)
            return orderedSchemas
              .map((name: string) => {
                const def = definitions[name]
                if (!def) return `// ⚠️ missing definition for ${name}`
                const pascalCaseName = toPascalCase(name)
                const zodCode = zod(def, pascalCaseName, true)
                return `const ${pascalCaseName}: z.ZodType<${pascalCaseName}Type> = ${zodCode}`
              })
              .filter((_, index) => {
                // Exclude root schema definition if it exists in definitions
                const rootDefinition = definitions[rootName]
                if (rootDefinition) {
                  const orderedSchemas = resolveSchemaDependenciesFromSchema(schema)
                  const rootIndex = orderedSchemas.indexOf(rootName)
                  return index !== rootIndex
                }
                return true
              })
              .join('\n\n')
          })()
        : ''

    // For circular dependencies, use the definition from definitions if it exists
    const rootDefinition = definitions[rootName]
    const generated = rootDefinition
      ? zod(rootDefinition, rootName, true)
      : zod(schema, rootName, true)

    // Generate root type definition
    const rootTypeDefinition = rootDefinition
      ? type(rootDefinition, rootName)
      : type(schema, rootName)
    const rootTypeCode = `type ${rootName}Type = ${rootTypeDefinition}\n\n`

    const typeDefinitionsCode = typeDefinitions ? `${typeDefinitions}\n\n` : ''
    const schemaDefinitionsCode = schemaDefinitions ? `${schemaDefinitions}\n\n` : ''

    return `import * as z from 'zod'\n\n${rootTypeCode}${typeDefinitionsCode}${schemaDefinitionsCode}export const ${rootName}: z.ZodType<${rootName}Type> = ${generated}\n\nexport type ${rootName} = z.infer<typeof ${rootName}>`
  }

  // Check if there are any references (including self-references)
  const hasReferences = (() => {
    const schemaStr = JSON.stringify(schema)
    // direct self reference
    if (schemaStr.includes('"$ref":"#"') || schemaStr.includes('"$ref": "#"')) {
      return true
    }
    // references in definitions
    if (schema.definitions || schema.$defs) {
      return true
    }
    return false
  })()

  // Generate type definitions for all referenced types first
  const typeDefinitions =
    Object.keys(definitions).length > 0
      ? (() => {
          // resolve dependencies and determine order
          const orderedSchemas = resolveSchemaDependenciesFromSchema(schema)
          return orderedSchemas
            .map((name: string) => {
              const def = definitions[name]
              if (!def) return `// ⚠️ missing definition for ${name}`
              const pascalCaseName = toPascalCase(name)
              const typeDef = type(def, pascalCaseName)
              return `type ${pascalCaseName}Type = ${typeDef}`
            })
            .join('\n\n')
        })()
      : ''

  // Generate type definition for root schema
  const rootTypeDefinition = type(schema, rootName)

  // Generate schema definitions for all referenced types (not exported)
  const schemaDefinitions =
    Object.keys(definitions).length > 0
      ? (() => {
          // resolve dependencies and determine order
          const orderedSchemas = resolveSchemaDependenciesFromSchema(schema)
          return orderedSchemas
            .map((name: string) => {
              const def = definitions[name]
              if (!def) return `// ⚠️ missing definition for ${name}`
              const pascalCaseName = toPascalCase(name)
              const zodCode = zod(def, pascalCaseName, true)
              return `const ${pascalCaseName}: z.ZodType<${pascalCaseName}Type> = ${zodCode}`
            })
            .join('\n\n')
        })()
      : ''

  const generated = zod(schema, rootName, true)
  const typeDefinitionsCode = typeDefinitions ? `${typeDefinitions}\n\n` : ''
  const schemaDefinitionsCode = schemaDefinitions ? `${schemaDefinitions}\n\n` : ''

  // Always include type definition when there are references
  const typeCode = hasReferences ? `type ${rootName}Type = ${rootTypeDefinition}\n\n` : ''

  const schemaExport = hasReferences
    ? `export const ${rootName}: z.ZodType<${rootName}Type> = ${generated}`
    : `export const ${rootName} = ${generated}`

  return `import * as z from 'zod'\n\n${typeCode}${typeDefinitionsCode}${schemaDefinitionsCode}${schemaExport}\n\nexport type ${rootName} = z.infer<typeof ${rootName}>`
}
