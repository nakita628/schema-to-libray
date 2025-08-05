import type { Schema } from '../../cli/index.js'
import { normalizeTypes, toPascalCase } from '../../helper/index.js'

export default function zod(
  schema: Schema,
  rootName: string = 'Schema',
  isSchemaToZod: boolean = false,
): string {
  // if (typeof schema === 'boolean' && schema === true) return 'z.any()'
  // /* $ref */
  if (schema.$ref) {
    if (Boolean(schema.$ref) === true) {
      const z = ref(schema, rootName, isSchemaToZod)
      return wrap(z, schema)
    }
    if (schema.type === 'array' && Boolean(schema.items?.$ref)) {
      if (schema.items?.$ref) {
        const r = wrap(ref(schema.items, rootName, isSchemaToZod), schema.items)
        return `z.array(${r})`
      }
      const z = wrap('z.array(z.any())', schema)
      return z
    }
    const z = 'z.any()'
    return wrap(z, schema)
  }
  // /* combinators */
  if (schema.oneOf) {
    if (!schema.oneOf?.length) return wrap('z.any()', schema)
    const schemas = schema.oneOf.map((s: Schema) => zod(s, rootName, isSchemaToZod))
    // discriminatedUnion Support hesitant
    //   This is because using intersection causes a type error.
    // const discriminator = schema.discriminator?.propertyName
    // const z = discriminator
    //   ? `z.discriminatedUnion('${discriminator}',[${schemas.join(',')}])`
    //   : `z.union([${schemas.join(',')}])`
    return wrap(`z.union([${schemas.join(',')}])`, schema)
  }
  if (schema.anyOf) {
    if (!schema.anyOf?.length) return wrap('z.any()', schema)
    const schemas = schema.anyOf.map((s: Schema) => zod(s, rootName, isSchemaToZod))
    return wrap(`z.union([${schemas.join(',')}])`, schema)
  }
  if (schema.allOf) {
    if (!schema.allOf?.length) return wrap('z.any()', schema)

    const { schemas, nullable, defaultValue } = schema.allOf.reduce<{
      schemas: string[]
      nullable: boolean
      defaultValue?: unknown
    }>(
      (acc: { schemas: string[]; nullable: boolean; defaultValue?: unknown }, s: Schema) => {
        const isOnlyNull = s.type === 'null' || (s.nullable === true && Object.keys(s).length === 1)

        if (isOnlyNull)
          return { schemas: acc.schemas, nullable: true, defaultValue: acc.defaultValue }

        // skip simple properties (default, const, etc.)
        if (Object.keys(s).length === 1 && (s.default !== undefined || s.const !== undefined)) {
          if (s.default !== undefined) {
            return {
              schemas: acc.schemas,
              nullable: acc.nullable,
              defaultValue: s.default,
            }
          }
          return acc
        }

        const newSchemas = [...acc.schemas, zod(s, rootName, isSchemaToZod)]
        return {
          schemas: newSchemas,
          nullable: acc.nullable,
          defaultValue: acc.defaultValue,
        }
      },
      {
        schemas: [],
        nullable:
          schema.nullable === true ||
          (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null'),
        defaultValue: undefined,
      },
    )

    if (!schemas.length) return wrap('z.any()', { ...schema, nullable })

    const baseResult = schemas.length === 1 ? schemas[0] : `z.intersection(${schemas.join(',')})`

    if (defaultValue !== undefined) {
      const formatLiteral = (v: unknown): string => {
        if (typeof v === 'number') return `${v}`
        return JSON.stringify(v)
      }
      const result = `${baseResult}.default(${formatLiteral(defaultValue)})`
      return wrap(result, { ...schema, nullable })
    }

    return wrap(baseResult, { ...schema, nullable })
  }
  // if (schema.not) return not(schema)
  /* const */
  // const
  if (schema.const) {
    const z = `z.literal(${JSON.stringify(schema.const)})`
    return wrap(z, schema)
  }
  /* enum */
  if (schema.enum) return wrap(_enum(schema), schema)
  /* properties */
  if (schema.properties) return wrap(object(schema, rootName, isSchemaToZod), schema)
  const types = normalizeTypes(schema.type)
  /* string */
  if (types.includes('string')) return wrap(string(schema), schema)
  /* number */
  if (types.includes('number')) return wrap(number(schema), schema)
  /* integer & bigint */
  if (types.includes('integer')) return wrap(integer(schema), schema)
  /* boolean */
  if (types.includes('boolean')) return wrap('z.boolean()', schema)
  /* array */
  if (types.includes('array')) return wrap(array(schema, rootName, isSchemaToZod), schema)
  /* object */
  if (types.includes('object')) return wrap(object(schema, rootName, isSchemaToZod), schema)
  /* date */
  if (types.includes('date')) return wrap('z.date()', schema)
  /* null only */
  if (types.length === 1 && types[0] === 'null') return wrap('z.null()', schema)
  console.warn(`fallback to z.any(): schema=${JSON.stringify(schema)}`)
  return wrap('z.any()', schema)
}

// string
/** Build a Zod string schema from an OpenAPI string schema. */
export function string(schema: Schema): string {
  const FORMAT_STRING: Record<string, string> = {
    email: 'email()',
    uuid: 'uuid()',
    uuidv4: 'uuidv4()',
    uuidv6: 'uuidv6()',
    uuidv7: 'uuidv7()',
    uri: 'url()',
    emoji: 'emoji()',
    base64: 'base64()',
    base64url: 'base64url()',
    nanoid: 'nanoid()',
    cuid: 'cuid()',
    cuid2: 'cuid2()',
    ulid: 'ulid()',
    ipv4: 'ipv4()',
    ipv6: 'ipv6()',
    cidrv4: 'cidrv4()',
    cidrv6: 'cidrv6()',
    date: 'iso.date()',
    time: 'iso.time()',
    'date-time': 'iso.datetime()',
    duration: 'iso.duration()',
    binary: 'file()',
    toLowerCase: 'toLowerCase()',
    toUpperCase: 'toUpperCase()',
    trim: 'trim()',
    jwt: 'jwt()',
  }

  const o: string[] = []
  const format = schema.format && FORMAT_STRING[schema.format]
  o.push(format ? `z.${format}` : 'z.string()')
  // pattern
  if (schema.pattern) {
    // Keep the pattern as is, just escape forward slashes
    const pattern = schema.pattern
    o.push(`.regex(/${pattern.replace(/(?<!\\)\//g, '\\/')}/)`)
  }
  // length
  if (
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength
  ) {
    o.push(`.length(${schema.minLength})`)
  } else {
    if (schema.minLength !== undefined) {
      o.push(`.min(${schema.minLength})`)
    }
    if (schema.maxLength !== undefined) {
      o.push(`.max(${schema.maxLength})`)
    }
  }
  return o.join('')
}

// _enum
export function _enum(schema: Schema): string {
  /* -------------------------- helpers -------------------------- */
  const hasType = (t: string): boolean =>
    schema.type === t || (Array.isArray(schema.type) && schema.type.some((x: unknown) => x === t))

  const lit = (v: unknown): string =>
    v === null ? 'null' : typeof v === 'string' ? `'${v}'` : String(v)

  const tuple = (arr: readonly unknown[]): string =>
    `z.tuple([${arr.map((i: unknown) => `z.literal(${lit(i)})`).join(',')}])`

  /* --------------------------- guard --------------------------- */
  if (!schema.enum || schema.enum.length === 0) return 'z.any()'

  /* ------------------- number / integer enum ------------------- */
  if (hasType('number') || hasType('integer')) {
    return schema.enum.length > 1
      ? `z.union([${schema.enum.map((v: unknown) => `z.literal(${v})`).join(',')}])`
      : `z.literal(${schema.enum[0]})`
  }

  /* ----------------------- boolean enum ------------------------ */
  if (hasType('boolean')) {
    return schema.enum.length > 1
      ? `z.union([${schema.enum.map((v: unknown) => `z.literal(${v})`).join(',')}])`
      : `z.literal(${schema.enum[0]})`
  }

  /* ----------------------- array enum -------------------------- */
  if (hasType('array')) {
    if (schema.enum.length === 1 && Array.isArray(schema.enum[0])) {
      return tuple(schema.enum[0])
    }

    const parts = schema.enum.map((v: unknown) =>
      Array.isArray(v) ? tuple(v) : `z.literal(${lit(v)})`,
    )
    return `z.union([${parts.join(',')}])`
  }

  /* ----------------------- string enum ------------------------- */
  if (schema.enum.every((v: unknown) => typeof v === 'string')) {
    return schema.enum.length > 1
      ? `z.enum(${JSON.stringify(schema.enum)})`
      : `z.literal('${schema.enum[0]}')`
  }

  /* -------------------- mixed / null only ---------------------- */
  if (schema.enum.length > 1) {
    const parts = schema.enum.map((v: unknown) => `z.literal(${lit(v)})`)
    return `z.union([${parts.join(',')}])`
  }

  return `z.literal(${lit(schema.enum[0])})`
}

// number
/**
 * Generates a Zod schema for number types based on OpenAPI schema.
 * Supports float, float32, float64, and number formats.
 *
 * @param schema - The OpenAPI schema object
 * @returns The Zod schema string
 */
function number(schema: Schema): string {
  const o: string[] = [
    schema.format === 'float' || schema.format === 'float32'
      ? 'z.float32()'
      : schema.format === 'float64'
        ? 'z.float64()'
        : 'z.number()',
  ]
  // minimum
  if (schema.minimum !== undefined) {
    // > 0
    // z.number().positive().safeParse(1) // { success: true }
    // z.number().positive().safeParse(0) // { success: false }
    if (schema.minimum === 0 && schema.exclusiveMinimum === true) {
      o.push('.positive()')
    }
    // >= 0
    // z.number().nonnegative().safeParse(0) // { success: true }
    // z.number().nonnegative().safeParse(-1) // { success: false }
    else if (schema.minimum === 0 && schema.exclusiveMinimum === false) {
      o.push('.nonnegative()')
    }
    // > value
    // z.number().gt(100) // value > 100
    else if (schema.exclusiveMinimum === true) {
      o.push(`.gt(${schema.minimum})`)
    }
    // >= value
    // z.number().min(100) // value >= 100
    else {
      o.push(`.min(${schema.minimum})`)
    }
  } else if (typeof schema.exclusiveMinimum === 'number') {
    // > value (no minimum)
    o.push(`.gt(${schema.exclusiveMinimum})`)
  }
  // maximum
  if (schema.maximum !== undefined) {
    // < 0
    // z.number().negative().safeParse(-1) // { success: true }
    // z.number().negative().safeParse(0) // { success: false }
    if (schema.maximum === 0 && schema.exclusiveMaximum === true) {
      o.push('.negative()')
    }
    // <= 0
    // z.number().nonpositive().safeParse(0) // { success: true }
    // z.number().nonpositive().safeParse(1) // { success: false }
    else if (schema.maximum === 0 && schema.exclusiveMaximum === false) {
      o.push('.nonpositive()')
    }
    // < value
    // z.number().lt(100) // value < 100
    else if (schema.exclusiveMaximum === true) {
      o.push(`.lt(${schema.maximum})`)
    }
    // <= value
    // z.number().max(100) // value <= 100
    else {
      o.push(`.max(${schema.maximum})`)
    }
  } else if (typeof schema.exclusiveMaximum === 'number') {
    // < value (no maximum)
    o.push(`.lt(${schema.exclusiveMaximum})`)
  }
  // multipleOf
  // z.number().multipleOf(2).safeParse(2) // { success: true }
  // z.number().multipleOf(2).safeParse(1) // { success: false }
  if (schema.multipleOf !== undefined) {
    o.push(`.multipleOf(${schema.multipleOf})`)
  }
  return o.join('')
}

// integer
/**
 * Generates a Zod schema for integer types based on OpenAPI schema.
 * Supports int32, int64, and bigint formats.
 *
 * @param schema - The OpenAPI schema object
 * @returns The Zod schema string
 */
function integer(schema: Schema): string {
  const isInt32 = schema.format === 'int32'
  const isInt64 = schema.format === 'int64'
  const isBigInt = schema.format === 'bigint'
  const o: string[] = [
    isInt32 ? 'z.int32()' : isInt64 ? 'z.int64()' : isBigInt ? 'z.bigint()' : 'z.int()',
  ]
  const lit = (n: number): string => {
    if (isBigInt) return `BigInt(${n})`
    if (isInt64) return `${n}n`
    return `${n}`
  }
  // minimum
  if (schema.minimum !== undefined || schema.exclusiveMinimum !== undefined) {
    // > 0
    // z.int().positive().safeParse(1) // { success: true }
    // z.int().positive().safeParse(0) // { success: false }
    if ((schema.minimum ?? schema.exclusiveMinimum) === 0 && schema.exclusiveMinimum === true) {
      o.push('.positive()')
    }
    // >= 0
    // z.int().nonnegative().safeParse(0) // { success: true }
    // z.int().nonnegative().safeParse(-1) // { success: false }
    else if (
      (schema.minimum ?? schema.exclusiveMinimum) === 0 &&
      schema.exclusiveMinimum === false
    ) {
      o.push('.nonnegative()')
    }
    // > value
    // z.int().gt(100) // value > 100
    // z.int().gt(100).safeParse(101) // { success: true }
    // z.int().gt(100).safeParse(100) // { success: false }
    else if (
      (schema.exclusiveMinimum === true || schema.minimum === undefined) &&
      typeof (schema.minimum ?? schema.exclusiveMinimum) === 'number'
    ) {
      o.push(`.gt(${lit((schema.minimum ?? schema.exclusiveMinimum) as number)})`)
    }
    // >= value
    // z.int().min(100) // value >= 100
    // z.int().min(100).safeParse(100) // { success: true }
    // z.int().min(100).safeParse(99) // { success: false }
    else if (typeof schema.minimum === 'number') {
      o.push(`.min(${lit(schema.minimum)})`)
    }
  }
  // maximum
  if (schema.maximum !== undefined || schema.exclusiveMaximum !== undefined) {
    // < 0
    // z.int().negative().safeParse(-1) // { success: true }
    // z.int().negative().safeParse(0) // { success: false }
    if ((schema.maximum ?? schema.exclusiveMaximum) === 0 && schema.exclusiveMaximum === true) {
      o.push('.negative()')
    }
    // <= 0
    // z.int().nonpositive().safeParse(0) // { success: true }
    // z.int().nonpositive().safeParse(1) // { success: false }
    else if (
      (schema.maximum ?? schema.exclusiveMaximum) === 0 &&
      schema.exclusiveMaximum === false
    ) {
      o.push('.nonpositive()')
    }
    // < value
    // z.int().lt(100) // value < 100
    // z.int().lt(100).safeParse(99) -> { success: true }
    // z.int().lt(100).safeParse(100) -> { success: false }
    else if (
      (schema.exclusiveMaximum === true || schema.maximum === undefined) &&
      typeof (schema.maximum ?? schema.exclusiveMaximum) === 'number'
    ) {
      o.push(`.lt(${lit((schema.maximum ?? schema.exclusiveMaximum) as number)})`)
    }
    // <= value
    // z.int().max(100) // value <= 100
    // z.int().max(100).safeParse(100) -> { success: true }
    // z.int().max(100).safeParse(101) -> { success: false }
    else if (typeof schema.maximum === 'number') {
      o.push(`.max(${lit(schema.maximum)})`)
    }
  }
  // multipleOf
  // z.int().multipleOf(2).safeParse(2) // { success: true }
  // z.int().multipleOf(2).safeParse(1) // { success: false }
  if (schema.multipleOf !== undefined && typeof schema.multipleOf === 'number') {
    o.push(`.multipleOf(${lit(schema.multipleOf)})`)
  }

  return o.join('')
}

// array
function array(schema: Schema, rootName: string, isSchemaToZod: boolean = false): string {
  // const array = `z.array(${schema.items ? zod(schema.items) : 'z.any()'})`
  const array = `z.array(${schema.items ? zod(schema.items, rootName, isSchemaToZod) : 'z.any()'})`
  if (typeof schema.minItems === 'number' && typeof schema.maxItems === 'number') {
    if (schema.minItems === schema.maxItems) {
      return `${array}.length(${schema.minItems})`
    }
    return `${array}.min(${schema.minItems}).max(${schema.maxItems})`
  }
  if (typeof schema.minItems === 'number') {
    return `${array}.min(${schema.minItems})`
  }
  if (typeof schema.maxItems === 'number') {
    return `${array}.max(${schema.maxItems})`
  }
  return array
}

// object
/**
 * Generates a Zod object schema from an OpenAPI schema definition.
 *
 * @param schema - Schema definition.
 * @returns The Zod object schema string.
 */
function object(schema: Schema, rootName: string, isSchemaToZod: boolean = false): string {
  if (schema.additionalProperties) {
    if (typeof schema.additionalProperties === 'boolean') {
      if (schema.properties) {
        const s = propertiesSchema(
          schema.properties,
          Array.isArray(schema.required) ? schema.required : [],
          rootName,
          isSchemaToZod,
        )
        if (schema.additionalProperties === true) {
          const z = s.replace('object', 'looseObject')
          return z
        }
        if (typeof schema.additionalProperties !== 'boolean') {
          const s = zod(schema.additionalProperties, rootName)
          const z = `z.record(z.string(), ${s})`
          return z
        }
      }
      return 'z.any()'
    }
    const s = zod(schema.additionalProperties)
    return `z.record(z.string(),${s})`
  }
  if (schema.properties) {
    const z = propertiesSchema(
      schema.properties,
      Array.isArray(schema.required) ? schema.required : [],
      rootName,
      isSchemaToZod,
    )
    if (schema.additionalProperties === false) {
      return z.replace('object', 'strictObject')
    }
    return z
  }
  // allOf, oneOf, anyOf, not
  if (schema.oneOf) return zod(schema, rootName, isSchemaToZod)
  if (schema.anyOf) return zod(schema, rootName, isSchemaToZod)
  if (schema.allOf) return zod(schema, rootName, isSchemaToZod)
  if (schema.not) return zod(schema, rootName, isSchemaToZod)
  return 'z.object({})'
}

// wrap
export function wrap(zod: string, schema: Schema): string {
  const formatLiteral = (v: unknown): string => {
    // boolean true or false
    if (typeof v === 'boolean') {
      return `${v}`
    }
    // number
    if (typeof v === 'number') {
      if (schema.format === 'int64') {
        return `${v}n`
      }
      if (schema.format === 'bigint') {
        return `BigInt(${v})`
      }
      return `${v}`
    }
    // date
    if (schema.type === 'date' && typeof v === 'string') {
      return `new Date(${JSON.stringify(v)})`
    }
    // string
    if (typeof v === 'string') {
      return JSON.stringify(v)
    }
    // other
    return JSON.stringify(v)
  }

  // why schema.default !== undefined becasue schema.default === 0  // → falsy
  const s = schema.default !== undefined ? `${zod}.default(${formatLiteral(schema.default)})` : zod

  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')

  const z = isNullable ? `${s}.nullable()` : s
  return z
}

// propertySchema
function propertiesSchema(
  properties: Record<string, Schema>,
  required: string[],
  rootName: string,
  isSchemaToZod: boolean = false,
): string {
  const objectProperties = Object.entries(properties)
    .map(([key, schema]) => {
      const parsed = zod(schema, rootName, isSchemaToZod)
      if (!parsed) return null
      const isRequired = required.includes(key)
      const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
      return `${safeKey}:${parsed}${isRequired ? '' : '.optional()'}`
    })
    .filter((v): v is string => v !== null)

  const allOptional = objectProperties.every((prop) => prop.includes('.optional()'))
  if (required.length === 0 && allOptional) {
    const cleanProperties = objectProperties.map((prop) => prop.replace('.optional()', ''))
    return `z.object({${cleanProperties}}).partial()`
  }
  return `z.object({${objectProperties}})`
}

function ref(schema: Schema, rootName: string, isSchemaToZod: boolean = false): string {
  // self reference (#)
  if (schema.$ref === '#' || schema.$ref === '') {
    const z = `z.lazy(() => ${rootName})`
    return wrap(z, schema)
  }

  // components / definitions / $defs
  const TABLE = [
    ['#/components/schemas/', 'Schema'],
    ['#/definitions/', 'Schema'],
    ['#/$defs/', 'Schema'],
  ] as const

  for (const [prefix] of TABLE) {
    if (schema.$ref?.startsWith(prefix)) {
      const name = schema.$ref.slice(prefix.length)
      const pascalCaseName = toPascalCase(name)
      // For self-references, use the export name directly
      if (pascalCaseName === rootName) {
        const z = `z.lazy(() => ${pascalCaseName})`
        return wrap(z, schema)
      }
      // For other references, use lazy reference when called from schemaToZod, otherwise use schema name with Schema suffix
      const z = isSchemaToZod
        ? `z.lazy(() => ${pascalCaseName})`
        : rootName === 'Schema'
          ? `${pascalCaseName}Schema`
          : `z.lazy(() => ${pascalCaseName})`
      return wrap(z, schema)
    }
  }

  // relative reference (#~) → resolve to schema name
  if (schema.$ref?.startsWith('#')) {
    const refName = schema.$ref.slice(1) // Remove the leading #
    if (refName === '') {
      // Self reference
      const z = `z.lazy(() => ${rootName})`
      return z
    }
    // Reference to another schema in the same document (e.g., #node, #animal)
    const pascalCaseName = toPascalCase(refName)
    const z = isSchemaToZod
      ? `z.lazy(() => ${pascalCaseName})`
      : rootName === 'Schema'
        ? `${pascalCaseName}Schema`
        : `z.lazy(() => ${pascalCaseName})`
    return z
  }

  // external file with fragment (e.g., "external.json#/definitions/node")
  if (schema.$ref?.includes('#')) {
    // const [filePath, fragment] = schema.$ref.split('#')

    // All external references are unknown
    return 'z.unknown()'
  }

  // external file or URL without fragment
  if (schema.$ref?.startsWith('http')) {
    const parts = schema.$ref?.split('/')
    const last = parts?.[parts.length - 1]
    if (last) {
      const z = last.replace(/\.json$/, '')
      return z
    }
  }

  return 'z.any()'
}
