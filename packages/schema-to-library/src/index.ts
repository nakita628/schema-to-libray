export { fmt } from './format/index.js'
export { schemaToArktype } from './generator/arktype/index.js'
export { schemaToEffect } from './generator/effect/index.js'
export { schemaToTypebox } from './generator/typebox/index.js'
export { schemaToValibot } from './generator/valibot/index.js'
export { schemaToZod } from './generator/zod/index.js'
export type { GeneratorOptions, JSONSchema, JSONSchemaFormat, JSONSchemaType } from './helper/index.js'
export { parseSchemaFile } from './parser/index.js'

// Expression-level functions for composing with external wrappers (e.g., openapi-hono)
export { arktype } from './generator/arktype/arktype.js'
export { effect } from './generator/effect/effect.js'
export { typebox } from './generator/typebox/typebox.js'
export { valibot } from './generator/valibot/valibot.js'
export { zod } from './generator/zod/zod.js'

// Utilities for OpenAPI component naming
export {
  OPENAPI_COMPONENT_SUFFIX_MAP,
  resolveOpenAPIRef,
  toIdentifierPascalCase,
  toPascalCase,
} from './utils/index.js'
