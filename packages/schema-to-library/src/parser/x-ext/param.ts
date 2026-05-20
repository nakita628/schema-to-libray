/**
 * OpenAPI parameter location.
 *
 * `query` / `path` are string-wire formats — when a primitive schema is
 * emitted under these contexts, generators apply type coercion (e.g. Zod
 * `z.coerce.number()`, Effect `Schema.NumberFromString`). `header` / `cookie`
 * are also string-wire but coercion policy is delegated per generator;
 * current generators treat them as no-op.
 *
 * @see https://spec.openapis.org/oas/v3.2.0.html#parameter-object
 */
export type ParamIn = 'query' | 'path' | 'header' | 'cookie'
