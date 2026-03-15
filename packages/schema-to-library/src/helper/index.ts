export type { JSONSchema, JSONSchemaFormat, JSONSchemaType } from './json-schema.js'
export { resolveSchemaDependenciesFromSchema } from './resolve-schema-dependencies-from-schema.js'

/**
 * Options for schema generators
 */
export type GeneratorOptions = {
  /**
   * Enable OpenAPI component-aware naming
   *
   * When true, $ref resolution uses OpenAPI component suffix map
   * (e.g., '#/components/schemas/User' → 'UserSchema')
   * and uses toIdentifierPascalCase for name conversion.
   */
  openapi?: boolean
}
