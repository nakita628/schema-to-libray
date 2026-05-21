import type { JSONSchema, ParamIn } from '../../parser/index.js'
import { makeSafeKey, valibotError } from '../../utils/index.js'
import { valibot } from './valibot.js'

/**
 * Generate a Valibot object schema for a JSON Schema object node.
 *
 * Dispatches `additionalProperties` to `v.looseObject` (true), `v.strictObject`
 * (false), `v.record` (Schema), or default `v.object`. Combinators
 * (oneOf/anyOf/allOf/not) delegate to the main `valibot` entry. JSON Schema
 * 2020-12 keywords (`minProperties`, `maxProperties`, `propertyNames`,
 * `patternProperties`, `dependentRequired`) are emitted as `v.check(...)`
 * actions composed via `v.pipe(...)`.
 *
 * NOTE: `v.pipe(base, v.readonly())` is appended by the dispatcher
 * (`valibot.ts:readonly`), so this function does NOT add it itself.
 */
export function object(
  schema: JSONSchema,
  rootName: string,
  isValibot: boolean,
  options?: { openapi?: boolean; readonly?: boolean; paramIn?: ParamIn },
) {
  if (schema.oneOf || schema.anyOf || schema.allOf || schema.not) {
    return valibot(schema, rootName, isValibot, options)
  }

  const errorMessage = schema['x-error-message']
  const errorArg = errorMessage ? `,${valibotError(errorMessage)}` : ''
  const minimumMessage = schema['x-minProperties-message']
  const minErrorArg = minimumMessage ? `,${valibotError(minimumMessage)}` : ''
  const maximumMessage = schema['x-maxProperties-message']
  const maxErrorArg = maximumMessage ? `,${valibotError(maximumMessage)}` : ''
  // v3.0: 1 keyword = 1 message
  const patternPropsMessage = schema['x-patternProperties-message']
  const patternErrorArg = patternPropsMessage ? `,${valibotError(patternPropsMessage)}` : ''
  const propNamesMessage = schema['x-propertyNames-message']
  const propNamesErrorArg = propNamesMessage ? `,${valibotError(propNamesMessage)}` : ''
  const depReqMessage = schema['x-dependentRequired-message']
  const depReqErrorArg = depReqMessage ? `,${valibotError(depReqMessage)}` : errorArg
  const depSchMessage = schema['x-dependentSchemas-message']
  const depSchErrorArg = depSchMessage ? `,${valibotError(depSchMessage)}` : errorArg
  // x-additionalProperties-message / x-unevaluatedProperties-message both
  // attach to the strictObject "extra key" rejection. Specific keyword takes
  // precedence (additionalProperties > unevaluatedProperties).
  const addlPropsMessage = schema['x-additionalProperties-message']
  const unevalPropsMessage =
    schema.unevaluatedProperties === false ? schema['x-unevaluatedProperties-message'] : undefined
  const strictExtrasMessage = addlPropsMessage ?? unevalPropsMessage

  const propertyNamesCheck = (): string => {
    if (schema.propertyNames?.pattern) {
      return `v.check((o)=>Object.keys(o).every((k)=>new RegExp(${JSON.stringify(schema.propertyNames.pattern)}).test(k))${propNamesErrorArg})`
    }
    if (schema.propertyNames?.enum) {
      return `v.check((o)=>Object.keys(o).every((k)=>${JSON.stringify(schema.propertyNames.enum)}.includes(k))${propNamesErrorArg})`
    }
    return ''
  }

  const patternPropertiesChecks = (): readonly string[] =>
    schema.patternProperties
      ? Object.entries(schema.patternProperties).map(([pattern, propSchema]) => {
          const s = valibot(propSchema, rootName, isValibot, options)
          return `v.check((o)=>Object.entries(o).every(([k,val])=>!new RegExp(${JSON.stringify(pattern)}).test(k)||v.safeParse(${s},val).success)${patternErrorArg})`
        })
      : []

  // ── additionalProperties: schema → v.record(...) + propertyNames + patternProperties ──
  if (typeof schema.additionalProperties === 'object') {
    const record = `v.record(v.string(),${valibot(schema.additionalProperties, rootName, isValibot, options)})`
    const actions = [propertyNamesCheck(), ...patternPropertiesChecks()].filter((a) => a !== '')
    return actions.length > 0 ? `v.pipe(${record},${actions.join(',')})` : record
  }

  if (!schema.properties) {
    if (schema.patternProperties) {
      const record = `v.record(v.string(),v.unknown())`
      const actions = [propertyNamesCheck(), ...patternPropertiesChecks()].filter((a) => a !== '')
      return actions.length > 0 ? `v.pipe(${record},${actions.join(',')})` : record
    }
    if (schema.additionalProperties === true) return 'v.any()'
    return 'v.object({})'
  }

  const conditionalKeysReferenced = Boolean(schema.if || schema.then || schema.else)
  const objectKind =
    schema.additionalProperties === true
      ? 'looseObject'
      : schema.additionalProperties === false || schema.unevaluatedProperties === false
        ? 'strictObject'
        : conditionalKeysReferenced
          ? 'looseObject'
          : 'object'
  const required = Array.isArray(schema.required) ? schema.required : []
  const props = Object.entries(schema.properties)
    .map(([key, propSchema]) => {
      const parsed = valibot(propSchema, rootName, isValibot, options)
      if (!parsed) return null
      const safeKey = makeSafeKey(key)
      const isRequired = required.includes(key)
      return isRequired ? `${safeKey}:${parsed}` : `${safeKey}:v.optional(${parsed})`
    })
    .filter((p) => p !== null)

  // `v.strictObject(entries, message)` surfaces the custom message on extras.
  const strictMsgArg =
    objectKind === 'strictObject' && strictExtrasMessage
      ? `,${valibotError(strictExtrasMessage)}`
      : ''
  const rawBase =
    required.length === 0 && props.every((p) => p.includes('v.optional('))
      ? `v.partial(v.${objectKind}({${props
          .map((p) => p.replace(/^(.+?):v\.optional\((.+)\)$/, '$1:$2'))
          .join(',')}}${strictMsgArg}))`
      : `v.${objectKind}({${props.join(',')}}${strictMsgArg})`
  const propsMessage = schema['x-properties-message']
  const partialBase = propsMessage
    ? (() => {
        const isArrow = /^\s*\(.*?\)\s*=>/.test(propsMessage)
        const msgExpr = isArrow ? `(${propsMessage})(issue)` : JSON.stringify(propsMessage)
        return `v.pipe(v.unknown(),v.rawCheck(({dataset,addIssue})=>{if(!dataset.typed)return;const result=v.safeParse(${rawBase},dataset.value);if(!result.success){for(const issue of result.issues){if(issue.path&&issue.path.length>0){addIssue({message:${msgExpr},path:issue.path})}else{addIssue(issue)}}}}))`
      })()
    : rawBase

  const minPropertiesCheck =
    typeof schema.minProperties === 'number'
      ? `v.check((o)=>Object.keys(o).length>=${schema.minProperties}${minErrorArg})`
      : ''
  const maxPropertiesCheck =
    typeof schema.maxProperties === 'number'
      ? `v.check((o)=>Object.keys(o).length<=${schema.maxProperties}${maxErrorArg})`
      : ''
  const dependentRequiredChecks: readonly string[] = schema.dependentRequired
    ? Object.entries(schema.dependentRequired).map(([key, deps]) => {
        const depsCheck = deps.map((d) => `'${d}' in o`).join('&&')
        return `v.check((o)=>!('${key}' in o)||(${depsCheck})${depReqErrorArg})`
      })
    : []
  // v3.0: dependentSchemas
  const dependentSchemasChecks: readonly string[] = schema.dependentSchemas
    ? Object.entries(schema.dependentSchemas).map(([key, subSchema]) => {
        const s = valibot(subSchema, rootName, isValibot, options)
        return `v.check((o)=>!('${key}' in o)||v.safeParse(${s},o).success${depSchErrorArg})`
      })
    : []
  // Extras rejection is wired into `v.strictObject` directly via its second
  // argument (see `strictMsgArg` above). No separate check needed.
  const additionalPropertiesCheck = ''
  // v3.0: if/then/else (Draft-07+)
  const ifThenElseChecks = (() => {
    if (!schema.if) return [] as string[]
    const ifSchema = valibot(schema.if, rootName, isValibot, options)
    const thenSchema = schema.then ? valibot(schema.then, rootName, isValibot, options) : undefined
    const elseSchema = schema.else ? valibot(schema.else, rootName, isValibot, options) : undefined
    if (!thenSchema && !elseSchema) return [] as string[]
    const ifMsg = schema['x-if-message']
    const thenMsg = schema['x-then-message'] ?? ifMsg
    const elseMsg = schema['x-else-message'] ?? ifMsg
    const parts: string[] = []
    if (thenSchema) {
      const arg = thenMsg ? `,${valibotError(thenMsg)}` : ''
      parts.push(
        `v.check((o)=>!v.safeParse(${ifSchema},o).success||v.safeParse(${thenSchema},o).success${arg})`,
      )
    }
    if (elseSchema) {
      const arg = elseMsg ? `,${valibotError(elseMsg)}` : ''
      parts.push(
        `v.check((o)=>v.safeParse(${ifSchema},o).success||v.safeParse(${elseSchema},o).success${arg})`,
      )
    }
    return parts
  })()

  const actions = [
    minPropertiesCheck,
    maxPropertiesCheck,
    propertyNamesCheck(),
    ...patternPropertiesChecks(),
    ...dependentRequiredChecks,
    ...dependentSchemasChecks,
    additionalPropertiesCheck,
    ...ifThenElseChecks,
  ].filter((a) => a !== '')

  return actions.length > 0 ? `v.pipe(${partialBase},${actions.join(',')})` : partialBase
}
