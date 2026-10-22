import { DEFAULT_ROOT_NAME, DEFINITION_REF_PREFIXES } from '../../constants/index.js'
import { isRootRef, isShapelessMember } from '../../guard/index.js'
import { itemsSchemaOf } from '../../helper/schema.js'
import { jsLiteral } from '../../helper/value.js'
import type { JSONSchema } from '../../parser/index.js'
import { makeSafeKey, normalizeTypes, toPascalCase } from '../../utils/index.js'
import { isInt64 } from './integer.js'

export function type(schema: JSONSchema | undefined, rootName: string = DEFAULT_ROOT_NAME): string {
  if (schema === undefined) return ''

  if (schema.$ref) {
    if (isRootRef(schema.$ref)) {
      return `v.InferOutput<typeof ${rootName}>`
    }

    for (const prefix of DEFINITION_REF_PREFIXES) {
      if (schema.$ref?.startsWith(prefix)) {
        const name = schema.$ref.slice(prefix.length)
        return `_${toPascalCase(name)}`
      }
    }

    if (schema.$ref?.startsWith('#')) {
      const refName = schema.$ref.slice(1)
      if (refName === '') return `v.InferOutput<typeof ${rootName}>`
      if (!refName.includes('/')) return `_${toPascalCase(refName)}`
    }

    return 'unknown'
  }

  if (schema.oneOf) return union(schema.oneOf, rootName)
  if (schema.anyOf) return union(schema.anyOf, rootName)
  if (schema.allOf) return intersection(schema.allOf, rootName)
  if (schema.not) return 'unknown'

  // A JSON value spelled as a literal is also its own TypeScript literal type; an int64's
  // number is a bigint.
  const literal = (value: unknown): string =>
    typeof value === 'number' && isInt64(schema) ? `${value}n` : jsLiteral(value)

  if (schema.const !== undefined) return literal(schema.const)

  if (schema.enum) {
    if (schema.enum.length === 1) return literal(schema.enum[0])
    return `(${schema.enum.map(literal).join(' | ')})`
  }

  if (schema.properties) return object(schema, rootName)

  const t = normalizeTypes(schema.type)
  const integerType = isInt64(schema) || schema.format === 'bigint' ? 'bigint' : 'number'
  const primitives = [
    t.includes('string') ? 'string' : undefined,
    t.includes('number') ? 'number' : t.includes('integer') ? integerType : undefined,
    t.includes('boolean') ? 'boolean' : undefined,
  ].filter((p) => p !== undefined)
  if (primitives.length > 1 && !t.includes('array') && !t.includes('object')) {
    return `(${primitives.join(' | ')})`
  }
  if (primitives.length > 0) return primitives[0]
  if (t.includes('array')) return array(schema, rootName)
  if (t.includes('object')) return object(schema, rootName)
  if (t.includes('date')) return 'Date'
  if (t.length === 1 && t[0] === 'null') return 'null'

  return 'unknown'
}

function union(schemas: readonly JSONSchema[], rootName: string): string {
  return `(${schemas.map((s) => type(s, rootName)).join(' | ')})`
}

function intersection(schemas: readonly JSONSchema[], rootName: string): string {
  const types = schemas.filter((s) => !isShapelessMember(s)).map((s) => type(s, rootName))

  if (types.length === 0) return 'unknown'
  if (types.length === 1) return types[0]
  return `(${types.join(' & ')})`
}

function array(schema: JSONSchema, rootName: string): string {
  const items = itemsSchemaOf(schema.items)
  return items ? `${type(items, rootName)}[]` : 'unknown[]'
}

function object(schema: JSONSchema, rootName: string): string {
  if (!schema.properties) {
    if (schema.additionalProperties) {
      if (typeof schema.additionalProperties === 'boolean') {
        return schema.additionalProperties
          ? '{ [key: string]: unknown }'
          : '{ [key: string]: never }'
      }
      return `{ [key: string]: ${type(schema.additionalProperties, rootName)} }`
    }
    return '{ [key: string]: unknown }'
  }

  const required = new Set(schema.required)
  const properties = Object.entries(schema.properties).map(([key, propSchema]) => {
    const propType = type(propSchema, rootName)
    const isRequired = required.has(key)
    const safeKey = makeSafeKey(key)
    return isRequired ? `${safeKey}: ${propType}` : `${safeKey}?: ${propType}`
  })

  return `{${properties.join('; ')}}`
}
