import { DEFAULT_ROOT_NAME, DEFINITION_REF_PREFIXES } from '../../constants/index.js'
import { isRootRef, isShapelessMember } from '../../guard/index.js'
import { itemsSchemaOf } from '../../helper/schema.js'
import { jsLiteral } from '../../helper/value.js'
import type { JSONSchema } from '../../parser/index.js'
import { makeSafeKey, normalizeTypes, toPascalCase } from '../../utils/index.js'

export function type(schema: JSONSchema | undefined, rootName: string = DEFAULT_ROOT_NAME): string {
  if (schema === undefined) return ''

  if (schema.$ref) {
    if (isRootRef(schema.$ref)) {
      return `z.infer<typeof ${rootName}>`
    }
    for (const prefix of DEFINITION_REF_PREFIXES) {
      if (schema.$ref.startsWith(prefix)) {
        return `_${toPascalCase(schema.$ref.slice(prefix.length))}`
      }
    }
    if (schema.$ref.startsWith('#')) {
      const refName = schema.$ref.slice(1)
      if (refName === '') return `z.infer<typeof ${rootName}>`
      if (!refName.includes('/')) return `_${toPascalCase(refName)}`
    }
    return 'unknown'
  }

  if (schema.oneOf || schema.anyOf) {
    const members = schema.oneOf ?? schema.anyOf ?? []
    return `(${members.map((s) => type(s, rootName)).join(' | ')})`
  }

  if (schema.allOf) {
    const members = schema.allOf.filter((s) => !isShapelessMember(s)).map((s) => type(s, rootName))
    if (members.length === 0) return 'unknown'
    if (members.length === 1) return members[0]
    return `(${members.join(' & ')})`
  }

  if (schema.not) return 'unknown'

  // A JSON value spelled as a literal is also its own TypeScript literal type.
  if (schema.const !== undefined) return jsLiteral(schema.const)

  if (schema.enum) {
    if (schema.enum.length === 1) return jsLiteral(schema.enum[0])
    return `(${schema.enum.map(jsLiteral).join(' | ')})`
  }

  if (schema.properties) {
    const required = new Set(schema.required)
    const properties = Object.entries(schema.properties).map(([key, propSchema]) => {
      const propType = type(propSchema, rootName)
      const safeKey = makeSafeKey(key)
      return required.has(key) ? `${safeKey}: ${propType}` : `${safeKey}?: ${propType}`
    })
    return `{${properties.join('; ')}}`
  }

  const t = normalizeTypes(schema.type)

  if (t.includes('string')) return 'string'
  if (t.includes('number')) return 'number'
  if (t.includes('integer')) return 'number'
  if (t.includes('boolean')) return 'boolean'
  if (t.includes('array')) {
    const items = itemsSchemaOf(schema.items)
    return items ? `${type(items, rootName)}[]` : 'unknown[]'
  }
  if (t.includes('object')) {
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
  if (t.includes('date')) return 'Date'
  if (t.length === 1 && t[0] === 'null') return 'null'

  return 'unknown'
}
