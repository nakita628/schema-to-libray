import type { ParamIn, ParamStyle } from '../parser/index.js'

/** The options every `schemaTo<Library>` document generator accepts. */
export type GenerateOptions = {
  /** Also export the inferred TypeScript type. Default: `true`. */
  readonly exportType?: boolean
  /** Name schemas as OpenAPI components are named, and resolve `#/components/schemas/` refs. */
  readonly openapi?: boolean
  /** Emit readonly arrays and objects. */
  readonly readonly?: boolean
  /** Honour the code-emitting `x-*` extensions. Unsafe: see `helper/code-extensions.ts`. */
  readonly unsafeCodeExtensions?: boolean
  /** The OpenAPI parameter location the schema is emitted for; its values are coerced from text. */
  readonly paramIn?: ParamIn
  /**
   * The parameter's `style`, which decides how its text is split into an array or an
   * object (`form` with `explode: false` reads `1,2,3`, `deepObject` gathers `deep[key]`).
   * Defaults to `form` for `query` / `cookie` / `formData` and `simple` for `path` / `header`.
   * Applies to the root schema only. Honoured by Zod, Valibot, Effect Schema and ArkType; a
   * no-op for TypeBox, Ajv and Yup.
   */
  readonly style?: ParamStyle
  /**
   * The parameter's `explode`. Defaults to `true` for `style: form`, else `false`. Honoured
   * where `style` is.
   */
  readonly explode?: boolean
  /**
   * The parameter's `allowEmptyValue` — an empty value reads as an absent one. Honoured
   * where `style` is.
   */
  readonly allowEmptyValue?: boolean
  /**
   * The media type of the parameter's `content`. A JSON one (`application/json`, `*+json`)
   * reads the text as a JSON document and validates it without coercion. Honoured where
   * `style` is.
   */
  readonly contentType?: string
}

/** The options threaded through every node emitter: `GenerateOptions` without `exportType`. */
export type EmitOptions = Omit<GenerateOptions, 'exportType'>
