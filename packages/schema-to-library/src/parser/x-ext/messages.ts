/**
 * A 層: メッセージ系 vendor extensions (`x-*-message`).
 *
 * Each entry overrides the default validator-generated message for one JSON
 * Schema keyword (or a related semantic group). Precedence chain inside each
 * generator is: `x-<keyword>-message` > `x-error-message` > validator default.
 *
 * Adding a new `x-*-message`:
 * 1. Append the field here.
 * 2. Plumb it through every relevant generator path (zod / valibot / typebox /
 *    arktype / effect).
 * 3. Add a `toBe` / `toStrictEqual` test for each touched generator.
 */
export type XExtMessages = {
  // Common (any schema type)
  /** General error / type-mismatch fallback */
  readonly 'x-error-message'?: string
  /** Missing required (`issue.input === undefined`) */
  readonly 'x-required-message'?: string
  /** `const` literal mismatch */
  readonly 'x-const-message'?: string
  /** `enum` value not in allowed list */
  readonly 'x-enum-message'?: string

  // Numeric
  /** `minimum` (inclusive) */
  readonly 'x-minimum-message'?: string
  /** `maximum` (inclusive) */
  readonly 'x-maximum-message'?: string
  /** `exclusiveMinimum` (`>`) */
  readonly 'x-exclusiveMinimum-message'?: string
  /** `exclusiveMaximum` (`<`) */
  readonly 'x-exclusiveMaximum-message'?: string
  /** `multipleOf` */
  readonly 'x-multipleOf-message'?: string

  // String
  /** `minLength` */
  readonly 'x-minLength-message'?: string
  /** `maxLength` */
  readonly 'x-maxLength-message'?: string
  /** `pattern` (`.regex()`) */
  readonly 'x-pattern-message'?: string

  // Array
  /** `minItems` */
  readonly 'x-minItems-message'?: string
  /** `maxItems` */
  readonly 'x-maxItems-message'?: string
  /** `uniqueItems` */
  readonly 'x-uniqueItems-message'?: string
  /** `contains` alone (at least 1 type-match) */
  readonly 'x-contains-message'?: string
  /** `minContains` (count lower bound) */
  readonly 'x-minContains-message'?: string
  /** `maxContains` (count upper bound) */
  readonly 'x-maxContains-message'?: string
  /** `prefixItems` (tuple positional schemas) */
  readonly 'x-prefixItems-message'?: string
  /** `items` (homogeneous element schema) */
  readonly 'x-items-message'?: string
  /** Generic length fallback for array `minItems` / `maxItems` */
  readonly 'x-length-message'?: string

  // Object
  /** `minProperties` */
  readonly 'x-minProperties-message'?: string
  /** `maxProperties` */
  readonly 'x-maxProperties-message'?: string
  /** `additionalProperties: false` (`unrecognized_keys`) */
  readonly 'x-additionalProperties-message'?: string
  /** `propertyNames` pattern / enum check */
  readonly 'x-propertyNames-message'?: string
  /** `patternProperties` value check */
  readonly 'x-patternProperties-message'?: string
  /** `dependentRequired` (key A ⇒ key B required) */
  readonly 'x-dependentRequired-message'?: string
  /** `dependentSchemas` (key A ⇒ sub-schema applies) */
  readonly 'x-dependentSchemas-message'?: string
  /** `properties` schema value check (typeless / generic) */
  readonly 'x-properties-message'?: string
  /** `unevaluatedProperties` violation (Draft 2019-09+) */
  readonly 'x-unevaluatedProperties-message'?: string
  /** `unevaluatedItems` violation (Draft 2019-09+) */
  readonly 'x-unevaluatedItems-message'?: string

  // Combinators
  /** `oneOf` (`z.xor` / `z.discriminatedUnion`) */
  readonly 'x-oneOf-message'?: string
  /** `anyOf` (`z.union`) */
  readonly 'x-anyOf-message'?: string
  /** `allOf` composition */
  readonly 'x-allOf-message'?: string
  /** `not` predicate */
  readonly 'x-not-message'?: string
  /**
   * Semantic alias for the implication pattern (`A → B`) encoded as
   * `anyOf:[{not:A},{required:B}]`. Takes precedence over `x-anyOf-message`
   * in the anyOf code path, then falls back to `x-error-message`. Acts as a
   * documentation aid and is silently ignored on schemas without `anyOf`.
   */
  readonly 'x-implication-message'?: string

  // Conditional (if/then/else)
  /** Shared fallback for `then`/`else` branch failures under `if` */
  readonly 'x-if-message'?: string
  /** Overrides `x-if-message` for `then` branch failures */
  readonly 'x-then-message'?: string
  /** Overrides `x-if-message` for `else` branch failures */
  readonly 'x-else-message'?: string
}
