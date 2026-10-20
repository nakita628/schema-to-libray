import { hasType } from '../../guard/index.js'
import type { EmitOptions } from '../../helper/index.js'
import type { JSONSchema, ParamIn, ParamStyle } from '../../parser/index.js'

/** A media type that holds a JSON document: `application/json` or any `+json` suffix. */
const JSON_MEDIA_TYPE_PATTERN = /^[^/]+\/(?:[^;]+\+)?json\s*(?:;|$)/iu

/** An empty value stands for an absent parameter, so its default applies. */
const EMPTY_VALUE_PREPROCESS = `(val)=>(val===''?undefined:val)`

/** The text of a `content: application/json` parameter, read as the JSON document it holds. */
const JSON_PREPROCESS = `(val)=>{if(typeof val!=='string')return val;try{return JSON.parse(val)}catch{return val}}`

/** `deep[age]=5&deep[name]=bob`, gathered into the one object `{ age, name }`. */
const DEEP_OBJECT_PREPROCESS = String.raw`(val)=>{if(typeof val!=='object'||val===null||Array.isArray(val))return val;const out=Object.entries(val).reduce<{[k:string]:unknown}>((acc,[key,value])=>{const name=/^[^[\]]+\[([^\]]+)\]$/u.exec(key)?.[1];return name===undefined?acc:{...acc,[name]:value}},{});return Object.keys(out).length>0?out:val}`

/** The leading `.` of a `label` value, as a regex literal. */
const LABEL_PREFIX = String.raw`/^\./u`

/** The leading `;name=` of a non-exploded `matrix` value, as a regex literal. */
const MATRIX_PREFIX = '/^;[^=]*=?/u'

/** Whether the options carry any of a parameter's serialization fields. */
export function hasParameterSerialization(options: EmitOptions | undefined): boolean {
  return (
    options?.style !== undefined ||
    options?.explode !== undefined ||
    options?.allowEmptyValue === true ||
    options?.contentType !== undefined
  )
}

/**
 * The options the nodes under a parameter's root are emitted with: no serialization, and
 * no string wire either when the parameter's text is a JSON document.
 */
export function withoutParameterSerialization(options: EmitOptions | undefined): EmitOptions {
  const isJson = isJsonMediaType(options?.contentType)
  return {
    ...(options?.openapi !== undefined && { openapi: options.openapi }),
    ...(options?.readonly !== undefined && { readonly: options.readonly }),
    ...(options?.unsafeCodeExtensions !== undefined && {
      unsafeCodeExtensions: options.unsafeCodeExtensions,
    }),
    ...(options?.paramIn !== undefined && !isJson && { paramIn: options.paramIn }),
  }
}

function isJsonMediaType(contentType: string | undefined): boolean {
  return contentType !== undefined && JSON_MEDIA_TYPE_PATTERN.test(contentType)
}

/** The `style` a parameter has when its Parameter Object names none. */
function defaultStyle(paramIn: ParamIn | undefined): ParamStyle | undefined {
  if (paramIn === 'path' || paramIn === 'header') return 'simple'
  if (paramIn === undefined) return undefined
  return 'form'
}

/** `text`, a string expression, split on `separator` — none for an empty text. */
function split(text: string, separator: string): string {
  return `(${text}===''?[]:${text}.split(${JSON.stringify(separator)}))`
}

/** An array of `[name, value, name, value, ...]` read into an object. */
function pairs(parts: string): string {
  return `${parts}.reduce<{[k:string]:string}>((acc,part,i,all)=>i%2===1?{...acc,[all[i-1]??'']:part}:acc,{})`
}

/** An array of `name=value` read into an object. */
function entries(parts: string): string {
  return `${parts}.reduce<{[k:string]:string}>((acc,part)=>{const i=part.indexOf('=');return i<0?{...acc,[part]:''}:{...acc,[part.slice(0,i)]:part.slice(i+1)}},{})`
}

/** A reader of a string value: `body` maps `text`, the value with `prefix` removed. */
function textReader(body: string, prefix?: string): string {
  const text = prefix === undefined ? 'val' : `val.replace(${prefix},'')`
  return `(val)=>{if(typeof val!=='string')return val;const text=${text};return ${body}}`
}

function arrayReader(style: ParamStyle, explode: boolean): string | undefined {
  if (style === 'simple') return textReader(split('text', ','))
  if (style === 'label') return textReader(split('text', explode ? '.' : ','), LABEL_PREFIX)
  if (style === 'matrix') {
    return explode
      ? textReader(
          `text.split(';').filter((part)=>part!=='').map((part)=>part.slice(part.indexOf('=')+1))`,
        )
      : textReader(split('text', ','), MATRIX_PREFIX)
  }
  // An exploded `form` (and its delimited siblings) repeats the name instead.
  if (explode || style === 'deepObject') return undefined
  const separator = style === 'spaceDelimited' ? ' ' : style === 'pipeDelimited' ? '|' : ','
  return textReader(split('text', separator))
}

function objectReader(style: ParamStyle, explode: boolean): string | undefined {
  if (style === 'deepObject') return DEEP_OBJECT_PREPROCESS
  if (style === 'simple') return textReader((explode ? entries : pairs)(split('text', ',')))
  if (style === 'label') {
    return textReader(
      explode ? entries(split('text', '.')) : pairs(split('text', ',')),
      LABEL_PREFIX,
    )
  }
  if (style === 'matrix') {
    return explode
      ? textReader(entries(`text.split(';').filter((part)=>part!=='')`))
      : textReader(pairs(split('text', ',')), MATRIX_PREFIX)
  }
  // An exploded `form` object spreads its properties over the query instead.
  if (explode) return undefined
  const separator = style === 'spaceDelimited' ? ' ' : style === 'pipeDelimited' ? '|' : ','
  return textReader(pairs(split('text', separator)))
}

function primitiveReader(style: ParamStyle): string | undefined {
  if (style === 'label') return textReader('text', LABEL_PREFIX)
  if (style === 'matrix') return textReader('text', MATRIX_PREFIX)
  return undefined
}

/** What reads a parameter's text in `style` into the value its schema describes. */
function styleReader(schema: JSONSchema, style: ParamStyle, explode: boolean): string | undefined {
  if (hasType(schema, 'array') || schema.items !== undefined || schema.prefixItems !== undefined) {
    return arrayReader(style, explode)
  }
  if (hasType(schema, 'object') || schema.properties !== undefined) {
    return objectReader(style, explode)
  }
  return primitiveReader(style)
}

/**
 * Wraps the root expression of a parameter's schema in what reads the parameter's
 * serialization: `allowEmptyValue`, a JSON `content`, or its `style` / `explode`.
 *
 * @see https://spec.openapis.org/oas/v3.2.0.html#style-examples
 */
export function parameter(schema: JSONSchema, inner: string, options: EmitOptions | undefined) {
  const style = options?.style ?? defaultStyle(options?.paramIn)
  const reader = isJsonMediaType(options?.contentType)
    ? JSON_PREPROCESS
    : style === undefined
      ? undefined
      : styleReader(schema, style, options?.explode ?? style === 'form')
  const steps = [
    options?.allowEmptyValue === true ? EMPTY_VALUE_PREPROCESS : undefined,
    reader,
  ].filter((step) => step !== undefined)
  return steps.reduceRight((acc, step) => `z.preprocess(${step},${acc})`, inner)
}
