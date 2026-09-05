import type { JSONSchema, ParamIn } from '../../parser/index.js'
import { toIdentifierPascalCase, toPascalCase } from '../../utils/index.js'
import { yup } from './yup.js'

/**
 * Convert a JSON Schema document to Yup schema source.
 *
 * First slice: objects, strings, numbers and integers. Combinators, `$ref` /
 * `$defs`, cycles and `x-*` extensions are silent no-ops.
 *
 * @param schema - JSON Schema object to convert
 * @param options - Generation options
 * @param options.exportType - Whether to include type export (default: true)
 * @param options.openapi - Enable OpenAPI component-aware naming (default: false)
 * @returns Generated TypeScript/Yup code string
 */
export function schemaToYup(
  schema: JSONSchema,
  options?: {
    exportType?: boolean
    openapi?: boolean
    readonly?: boolean
    unsafeCodeExtensions?: boolean
    paramIn?: ParamIn
  },
): string {
  const exportType = options?.exportType ?? true
  const toName = options?.openapi === true ? toIdentifierPascalCase : toPascalCase
  const rootName = schema.title ? toName(schema.title) : 'Schema'

  return [
    `import * as yup from 'yup'`,
    `export const ${rootName} = ${yup(schema)}`,
    ...(exportType ? [`export type ${rootName} = yup.InferType<typeof ${rootName}>`] : []),
  ].join('\n\n')
}
