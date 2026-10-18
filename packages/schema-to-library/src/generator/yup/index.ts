import type { GenerateOptions } from '../../helper/index.js'
import { rootNameOf, schemaNamer } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
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
export function schemaToYup(schema: JSONSchema, options?: GenerateOptions): string {
  const exportType = options?.exportType ?? true
  const rootName = rootNameOf(schema, schemaNamer(options?.openapi))

  return [
    `import * as yup from 'yup'`,
    `export const ${rootName} = ${yup(schema)}`,
    ...(exportType ? [`export type ${rootName} = yup.InferType<typeof ${rootName}>`] : []),
  ].join('\n\n')
}
