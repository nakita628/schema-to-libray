import type { JSONSchema } from '../../helper/index.js'
import { error } from '../../utils/index.js'

/**
 * Generate Zod enum schema from JSON Schema
 *
 * @param schema - JSON Schema object with enum values
 * @returns Generated Zod enum schema code
 * @example
 * ```ts
 * const schema = { enum: ['red', 'green', 'blue'] }
 * _enum(schema) // 'z.enum(["red","green","blue"])'
 * ```
 */
export function _enum(schema: JSONSchema): string {
  /* -------------------------- helpers -------------------------- */
  const hasType = (t: string): boolean =>
    schema.type === t || (Array.isArray(schema.type) && schema.type.some((x: unknown) => x === t))

  const lit = (v: unknown): string =>
    v === null ? 'null' : typeof v === 'string' ? `'${v}'` : String(v)

  const tuple = (arr: readonly unknown[]): string =>
    `z.tuple([${arr.map((i: unknown) => `z.literal(${lit(i)})`).join(',')}])`

  /* ---------------------- error messages ----------------------- */
  const errorMessage = schema['x-error-message']
  const errArg = errorMessage ? `,${error(errorMessage)}` : ''
  const enumMessages = schema['x-enum-error-messages']
  const litErrArg = (v: unknown): string => {
    if (enumMessages) {
      const key = String(v)
      if (key in enumMessages) return `,${error(enumMessages[key])}`
    }
    return errArg
  }

  /* --------------------------- guard --------------------------- */
  if (!schema.enum || schema.enum.length === 0) return 'z.any()'

  /* ------------------- number / integer enum ------------------- */
  if (hasType('number') || hasType('integer')) {
    return schema.enum.length > 1
      ? `z.union([${schema.enum.map((v: unknown) => `z.literal(${lit(v)}${litErrArg(v)})`).join(',')}]${errArg})`
      : `z.literal(${lit(schema.enum[0])}${litErrArg(schema.enum[0])})`
  }

  /* ----------------------- boolean enum ------------------------ */
  if (hasType('boolean')) {
    return schema.enum.length > 1
      ? `z.union([${schema.enum.map((v: unknown) => `z.literal(${lit(v)}${litErrArg(v)})`).join(',')}]${errArg})`
      : `z.literal(${lit(schema.enum[0])}${litErrArg(schema.enum[0])})`
  }

  /* ----------------------- array enum -------------------------- */
  if (hasType('array')) {
    if (schema.enum.length === 1 && Array.isArray(schema.enum[0])) {
      return tuple(schema.enum[0])
    }

    const parts = schema.enum.map((v: unknown) =>
      Array.isArray(v) ? tuple(v) : `z.literal(${lit(v)}${litErrArg(v)})`,
    )
    return `z.union([${parts.join(',')}]${errArg})`
  }

  /* ----------------------- string enum ------------------------- */
  if (schema.enum.every((v: unknown) => typeof v === 'string')) {
    if (schema.enum.length > 1) {
      if (enumMessages) {
        return `z.union([${schema.enum.map((v: unknown) => `z.literal(${lit(v)}${litErrArg(v)})`).join(',')}]${errArg})`
      }
      return `z.enum(${JSON.stringify(schema.enum)}${errArg})`
    }
    return `z.literal('${schema.enum[0]}'${litErrArg(schema.enum[0])})`
  }

  /* -------------------- mixed / null only ---------------------- */
  if (schema.enum.length > 1) {
    const parts = schema.enum.map((v: unknown) => `z.literal(${lit(v)}${litErrArg(v)})`)
    return `z.union([${parts.join(',')}]${errArg})`
  }

  return `z.literal(${lit(schema.enum[0])}${litErrArg(schema.enum[0])})`
}
