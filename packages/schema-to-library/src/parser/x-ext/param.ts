import type { PARAM_LOCATIONS, PARAM_STYLES } from '../../constants/index.js'

/**
 * OpenAPI parameter location, or `formData` for a field of a form body
 * (`application/x-www-form-urlencoded`, `multipart/form-data`).
 *
 * Every location is string-wire — when a primitive schema is emitted under one of
 * them, generators apply type coercion (e.g. Zod `z.coerce.number()`, Effect
 * `Schema.NumberFromString`).
 *
 * @see https://spec.openapis.org/oas/v3.2.0.html#parameter-object
 */
export type ParamIn = (typeof PARAM_LOCATIONS)[number]

/**
 * The `style` of an OpenAPI Parameter Object: how its text is serialised. Defaults to
 * `form` for `query` / `cookie` / `formData` and `simple` for `path` / `header`.
 *
 * @see https://spec.openapis.org/oas/v3.2.0.html#style-values
 */
export type ParamStyle = (typeof PARAM_STYLES)[number]
