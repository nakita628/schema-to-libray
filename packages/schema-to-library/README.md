# Schema to Library

```bash
npm install -D schema-to-library
```

## What is schema-to-library?

**[schema-to-library](https://www.npmjs.com/package/schema-to-library)** is a library (with CLI) that converts JSON Schema into code for validation libraries.
It helps you automatically generate type-safe validation schemas and TypeScript types from your existing schema definitions, either via the bundled CLI commands or programmatically by importing `schemaToZod` / `schemaToValibot` / `schemaToEffect` / `schemaToTypebox` / `schemaToArktype`.

## Supported Libraries

- **[Zod](https://zod.dev/)**
- **[Valibot](https://valibot.dev/)**
- **[Effect Schema](https://effect.website/)**
- **[TypeBox](https://github.com/sinclairzx81/typebox)**
- **[Arktype](https://arktype.io/)**

## Usage

### CLI Usage

```bash
npx schema-to-zod path/to/input.{json,yaml} -o path/to/output.ts
npx schema-to-valibot path/to/input.{json,yaml} -o path/to/output.ts
npx schema-to-effect path/to/input.{json,yaml} -o path/to/output.ts
npx schema-to-typebox path/to/input.{json,yaml} -o path/to/output.ts
npx schema-to-arktype path/to/input.{json,yaml} -o path/to/output.ts
```

#### Options

| Flag            | Description                   |
| --------------- | ----------------------------- |
| `--export-type` | Include type export in output |
| `--readonly`    | Generate readonly types       |
| `-h, --help`    | Display help for command      |

### Example

input:

```json
{
  "title": "User",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "age": { "type": "integer", "minimum": 0 }
  },
  "required": ["name", "email"]
}
```

Default output (schema only):

#### Zod

```ts
import * as z from 'zod'

export const User = z.object({
  name: z.string(),
  email: z.email(),
  age: z.int().min(0).optional(),
})
```

#### Valibot

```ts
import * as v from 'valibot'

export const User = v.object({
  name: v.string(),
  email: v.pipe(v.string(), v.email()),
  age: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
})
```

#### Effect Schema

```ts
import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
  age: Schema.optional(Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))),
})
```

#### TypeBox

```ts
import { Type, type Static } from 'typebox'

export const User = Type.Object({
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  age: Type.Optional(Type.Integer({ minimum: 0 })),
})
```

#### Arktype

```ts
import { type } from 'arktype'

export const User = type({
  name: 'string',
  email: 'string.email',
  'age?': 'number.integer >= 0',
})
```

With `--export-type`, type exports are also generated:

```ts
// Zod
export type User = z.infer<typeof User>

// Valibot
export type UserOutput = v.InferOutput<typeof User>

// Effect Schema
export type UserEncoded = typeof User.Encoded

// TypeBox
export type User = Static<typeof User>

// Arktype
export type User = typeof User.infer
```

## Custom Validation Error Messages (`x-*-message`)

Each generator wires JSON Schema-style validation error messages into the target validator's native error API. Coverage varies per validator due to API differences.

### Coverage Matrix (39 extensions, v3.2)

| Category    | Extension                         |     zod     |   valibot   |   effect    |   arktype   |   typebox   |
| ----------- | --------------------------------- | :---------: | :---------: | :---------: | :---------: | :---------: |
| Common      | `x-error-message`                 |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Common      | `x-required-message`              |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Common      | `x-const-message`                 |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Common      | `x-enum-message`                  |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Numeric     | `x-minimum-message`               |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Numeric     | `x-maximum-message`               |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Numeric     | `x-exclusiveMinimum-message`      |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Numeric     | `x-exclusiveMaximum-message`      |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Numeric     | `x-multipleOf-message`            |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| String      | `x-minLength-message`             |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| String      | `x-maxLength-message`             |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| String      | `x-pattern-message`               |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-minItems-message`              |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-maxItems-message`              |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-uniqueItems-message`           |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-contains-message`              |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-minContains-message`           |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-maxContains-message`           |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-prefixItems-message`           |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-items-message`                 |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-length-message`                |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-unevaluatedItems-message`      |     ⚪      |     ⚪      |     ⚪      |     ⚪      |     ✅      |
| Object      | `x-minProperties-message`         |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-maxProperties-message`         |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-additionalProperties-message`  |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-propertyNames-message`         |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-patternProperties-message`     |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-dependentRequired-message`     |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-dependentSchemas-message`      |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-properties-message`            |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-unevaluatedProperties-message` |     ⚪      |     ⚪      |     ⚪      |     ⚪      |     ✅      |
| Combinators | `x-allOf-message`                 |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Combinators | `x-anyOf-message`                 |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Combinators | `x-oneOf-message`                 |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Combinators | `x-not-message`                   |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Combinators | `x-implication-message`           |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Conditional | `x-if-message`                    |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Conditional | `x-then-message`                  |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Conditional | `x-else-message`                  |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| **Total**   |                                   | **37 / 39** | **37 / 39** | **37 / 39** | **37 / 39** | **39 / 39** |

Legend: ✅ = message wired into emission, ⚪ = type slot accepted but no generator-side emission yet (passes through `[k: string]: unknown`).

The translation strategy per generator:

- **Zod** — native `z.<type>({error: 'msg'})` arguments and `.refine((v, ctx) => ctx.addIssue(...))`-style hooks
- **Valibot** — `v.minLength(n, 'msg')` style action arguments and `v.check((v) => ..., 'msg')` for advanced keywords
- **Effect** — `Schema.minLength(n, { message: () => 'msg' })` and `Schema.filter((v) => ..., { message: ... })`
- **Arktype** — DSL constraints + `.describe('msg')` for type-level messages, and `.narrow((v, ctx) => check || ctx.mustBe('msg'))` for per-keyword messages
- **TypeBox** — ajv-errors–compatible `errorMessage: { type: 'msg', minLength: 'msg', ... }` annotation aggregating all keyword messages

### Quick Example (Zod)

```json
{
  "type": "object",
  "required": ["name", "age"],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 50,
      "x-error-message": "Name must be a string",
      "x-minLength-message": "Name cannot be empty",
      "x-maxLength-message": "Name must be at most 50 characters"
    },
    "age": {
      "type": "integer",
      "minimum": 0,
      "maximum": 120,
      "x-minimum-message": "Age must be >= 0",
      "x-maximum-message": "Age must be <= 120"
    }
  }
}
```

```ts
// schema-to-zod -i input.json -o output.ts
import { z } from 'zod'

export const Root = z.object({
  name: z
    .string({ error: 'Name must be a string' })
    .min(1, { error: 'Name cannot be empty' })
    .max(50, { error: 'Name must be at most 50 characters' }),
  age: z.int().min(0, { error: 'Age must be >= 0' }).max(120, { error: 'Age must be <= 120' }),
})
```

## Behavior Extensions

Beyond message extensions, schema-to-library accepts a small set of safe **DSL-style** behavior extensions. Each extension takes a **literal value** (boolean / enum / number / regex string) and is mapped to the target validator's native API. No raw code strings are accepted — this is by design (the input may originate from an untrusted JSON Schema source).

### String pre-validation transforms (all generators)

| Extension       | Zod                           | Valibot              | Effect              | Arktype                          | TypeBox                             |
| --------------- | ----------------------------- | -------------------- | ------------------- | -------------------------------- | ----------------------------------- |
| `x-trim`        | `z.string().trim()`           | `v.trim()`           | `Schema.Trim`       | `.pipe((s) => s.trim())`         | `Type.Transform(...).Decode/Encode` |
| `x-toLowerCase` | `z.string().toLowerCase()`    | `v.toLowerCase()`    | `Schema.Lowercase`  | `.pipe((s) => s.toLowerCase())`  | `Type.Transform(...).Decode/Encode` |
| `x-toUpperCase` | `z.string().toUpperCase()`    | `v.toUpperCase()`    | `Schema.Uppercase`  | `.pipe((s) => s.toUpperCase())`  | `Type.Transform(...).Decode/Encode` |
| `x-normalize`   | `z.string().normalize('NFC')` | `v.normalize('NFC')` | `Schema.Trim` 系    | `.pipe((s) => s.normalize(...))` | n/a                                 |
| `x-startsWith`  | `.startsWith(s)`              | `v.startsWith(s)`    | `Schema.startsWith` | DSL constraint                   | n/a                                 |
| `x-endsWith`    | `.endsWith(s)`                | `v.endsWith(s)`      | `Schema.endsWith`   | DSL constraint                   | n/a                                 |
| `x-includes`    | `.includes(s)`                | `v.includes(s)`      | `Schema.includes`   | DSL constraint                   | n/a                                 |

### Brand & Readonly

| Extension    | Zod             | Valibot        | Effect              | Arktype       | TypeBox           |
| ------------ | --------------- | -------------- | ------------------- | ------------- | ----------------- |
| `x-brand`    | `.brand<"T">()` | `v.brand("T")` | `Schema.brand("T")` | `.brand("T")` | skip              |
| `x-readonly` | `.readonly()`   | `v.readonly()` | skip                | `.readonly()` | `Type.Readonly()` |

### Default / Fallback / Coerce (per-library)

The default-on-failure behaviors map to each library's native API name. They are implemented only where the target library provides a direct equivalent.

| Extension    | Zod            | Valibot                           | Effect | Arktype | TypeBox |
| ------------ | -------------- | --------------------------------- | ------ | ------- | ------- |
| `x-prefault` | `.prefault(v)` | skip                              | skip   | skip    | skip    |
| `x-catch`    | `.catch(v)`    | skip                              | skip   | skip    | skip    |
| `x-fallback` | skip           | `v.fallback(schema, v)` ← **new** | skip   | skip    | skip    |
| `x-coerce`   | `z.coerce.*`   | skip                              | skip   | skip    | skip    |

### Zod format-specific options (Zod-only, new)

When `format` is set, these extensions are passed into Zod v4's native option object. Other generators silently skip them (Valibot/Effect/Arktype/TypeBox have no direct equivalents).

| Extension        | Maps to                                    | Values                            |
| ---------------- | ------------------------------------------ | --------------------------------- |
| `x-emailPattern` | `z.email({ pattern: z.regexes.<v>Email })` | `html5` / `browser` / `unicode`   |
| `x-emailRegex`   | `z.email({ pattern: /.../ })`              | custom regex string               |
| `x-uuidVersion`  | `z.uuid({ version })`                      | `v1` / `v4` / `v6` / `v7` / `v8`  |
| `x-urlProtocol`  | `z.url({ protocol: /.../ })`               | regex string                      |
| `x-urlHostname`  | `z.url({ hostname: /.../ })`               | regex string                      |
| `x-urlNormalize` | `z.url({ normalize })`                     | `true` / `false`                  |
| `x-isoPrecision` | `z.iso.datetime({ precision })`            | fractional second digits (number) |
| `x-isoOffset`    | `z.iso.datetime({ offset })`               | `true` / `false`                  |
| `x-isoLocal`     | `z.iso.datetime({ local })`                | `true` / `false`                  |
| `x-jwtAlg`       | `z.jwt({ alg })`                           | `HS256` etc.                      |

Example:

```yaml
httpsUrl:
  type: string
  format: uri
  x-urlProtocol: '^https$'
  x-urlNormalize: true
preciseDatetime:
  type: string
  format: date-time
  x-isoPrecision: 3
  x-isoOffset: true
```

```ts
import { z } from 'zod'

export const HttpsUrl = z.url({ protocol: /^https$/, normalize: true })
export const PreciseDatetime = z.iso.datetime({ precision: 3, offset: true })
```

### Code-emitting extensions (programmatic opt-in: `unsafeCodeExtensions`)

> [!CAUTION]
> These extensions accept **raw TypeScript expressions** that are inlined into the generated code. **Never enable them on JSON Schemas fetched from untrusted sources** — a hostile schema can embed any expression that will run during your build/CI/runtime, which is a clean supply-chain attack path. A defense-in-depth denylist (`process` / `require` / `eval` / `Function` / `globalThis` / `constructor` / `__proto__` / browser globals / backticks / `\u`/`\x` escapes / `['…']` computed access) silently drops obviously malicious values, but the only real protection is keeping the input schema inside your own trust boundary.

Enable via the programmatic API only by passing `{ unsafeCodeExtensions: true }` to `schemaToZod` / `schemaToValibot` / `schemaToEffect` / `schemaToArktype`. There is no CLI flag — the feature is opt-in by design to keep the surface that processes untrusted schemas minimal. Generated files include a `// @generated-with-unsafe-code-extensions` marker at the top for grep auditing.

Per-library API-name mapping (raw expression values, library-native API names):

| Concept             | Zod            | Valibot       | Effect        | Arktype    | TypeBox |
| ------------------- | -------------- | ------------- | ------------- | ---------- | ------- |
| Custom predicate    | `x-refine`     | `x-check`     | `x-filter`    | `x-narrow` | skip    |
| Transform / morph   | `x-transform`  | `x-transform` | `x-transform` | `x-morph`  | skip    |
| Pipe composition    | `x-pipe`       | `x-pipe`      | `x-pipe`      | `x-pipe`   | skip    |
| Bidirectional codec | `x-codec`      | skip          | skip          | skip       | skip    |
| Preprocess input    | `x-preprocess` | skip          | skip          | skip       | skip    |

Example (Zod, with `unsafeCodeExtensions: true`):

```yaml
password:
  type: string
  minLength: 8
  x-refine: '.refine((v) => /[A-Z]/.test(v), { message: "needs uppercase" })'
updatedAt:
  type: string
  format: date-time
  x-codec: 'z.codec(z.iso.datetime(), z.date(), { decode: (v) => new Date(v), encode: (v) => v.toISOString() })'
```

```ts
// @generated-with-unsafe-code-extensions

import * as z from 'zod'

export const Password = z
  .string()
  .min(8)
  .refine((v) => /[A-Z]/.test(v), { message: 'needs uppercase' })

export const UpdatedAt = z.codec(z.iso.datetime(), z.date(), {
  decode: (v) => new Date(v),
  encode: (v) => v.toISOString(),
})
```

Without `unsafeCodeExtensions: true`, code-emitting extension values are silently dropped at codegen time.

## Programmatic API

The CLI is a thin wrapper around the programmatic entry points. Import the generator that matches your target library to embed schema generation in build scripts, test fixtures, or framework integrations:

```ts
import { schemaToZod } from 'schema-to-library'
import type { JSONSchema } from 'schema-to-library'

const schema: JSONSchema = { type: 'integer', minimum: 1 }
const code = schemaToZod(schema, { paramIn: 'query' })
//   → "import * as z from 'zod'\n\nexport const Schema = z.coerce.int().min(1)"
```

### Programmatic Options

The same `options` shape is accepted by `schemaToZod` / `schemaToValibot` / `schemaToEffect` / `schemaToTypebox` / `schemaToArktype` (TypeBox does not accept `unsafeCodeExtensions`).

| Option                 | Type                                        | Default | Description                                                                                                                                                |
| ---------------------- | ------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exportType`           | `boolean`                                   | `true`  | Append `export type X = ...` after the schema export                                                                                                       |
| `openapi`              | `boolean`                                   | `false` | Resolve `#/components/{schemas,parameters,...}` refs and use OpenAPI-aware identifier casing                                                               |
| `readonly`             | `boolean`                                   | `false` | Emit readonly arrays / readonly object types                                                                                                               |
| `paramIn`              | `'query' \| 'path' \| 'header' \| 'cookie'` | —       | Treat the schema as an OpenAPI parameter; `query` / `path` enable per-library string-wire coercion (see below). `header` / `cookie` are accepted but no-op |
| `unsafeCodeExtensions` | `boolean`                                   | `false` | Honor code-emitting `x-*` extensions. Trust your input — generated code is executed at build time                                                          |

## OpenAPI Parameter Coercion (`paramIn`)

When a schema represents an OpenAPI `parameter` whose `in` is `query` or `path`, the wire format is always a string. Pass `paramIn: 'query' | 'path'` to apply per-library auto-coercion on primitives. There is **no CLI flag** — call the programmatic API directly when emitting parameter schemas.

User-supplied `x-coerce: false` overrides `paramIn` (per-schema opt-out wins). Coercion propagates recursively through `object.properties` and `array.items`.

| Type      | Zod                 | Valibot                                                              | Effect                     | TypeBox                                                                                                        | Arktype                               |
| --------- | ------------------- | -------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `number`  | `z.coerce.number()` | `v.pipe(v.string(), v.transform(Number), v.number())`                | `Schema.NumberFromString`  | `Type.Transform(Type.String()).Decode((v)=>Number(v)).Encode(String)`                                          | `"string.numeric.parse"`              |
| `integer` | `z.coerce.int()`    | `v.pipe(v.string(), v.transform(Number), v.number(), v.integer())`   | `Schema.NumberFromString`  | `Type.Transform(Type.String()).Decode((v)=>Number.parseInt(v,10)).Encode(String)`                              | `"string.integer.parse"`              |
| `boolean` | `z.stringbool()`    | `v.pipe(v.picklist(['true','false']), v.transform((s)=>s==='true'))` | `Schema.BooleanFromString` | `Type.Transform(Type.Union([Type.Literal('true'),Type.Literal('false')])).Decode((v)=>v==='true').Encode(...)` | `type("'true' \| 'false'").pipe(...)` |
| `date`    | `z.coerce.date()`   | `v.pipe(v.string(), v.transform((s)=>new Date(s)), v.date())`        | `Schema.DateFromString`    | `Type.Transform(Type.String()).Decode((v)=>new Date(v)).Encode((v)=>v.toISOString())`                          | `"string.date.parse"`                 |

TypeBox transforms are evaluated by `Value.Decode`, **not** `Value.Check` — pick the API that matches your validation pipeline.

## Migration from 0.2.x

### CLI flag removals (breaking)

- **`--unsafe-code-extensions`** — removed. The feature is still available; call the programmatic API instead:

  ```ts
  import { schemaToZod } from 'schema-to-library'
  const code = schemaToZod(schema, { unsafeCodeExtensions: true })
  ```

  The CLI surface is now minimal to keep the path that processes untrusted schemas tight.

- **stderr warning when code-emitting extensions appear without the opt-in** — also removed. Programmatic callers that pass a schema with `x-refine` / `x-codec` / etc. but no `unsafeCodeExtensions: true` get the same silent drop, with no warning. If you depended on this signal, gate it yourself with `findCodeExtensionKeysInSchema` from `schema-to-library`.

### Coercion contract fix (security)

Previously, on **Valibot / Effect / TypeBox / Arktype**, a user-supplied `x-coerce: false` was silently overridden when `paramIn` (or its predecessor flag) was set. Starting with 0.3.0, `x-coerce: false` always wins on all 5 generators. If you were relying on the override behavior, switch to leaving `x-coerce` unset.

## License

Distributed under the MIT License. See [LICENSE](https://github.com/nakita628/schema-to-libray?tab=MIT-1-ov-file) for more information.
