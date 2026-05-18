# Schema to Library

```bash
npm install -D schema-to-library
```

## What is schema-to-library?

**[schema-to-library](https://www.npmjs.com/package/schema-to-library)** is a CLI tool that converts JSON Schema into code for validation libraries.
It helps you automatically generate type-safe validation schemas and TypeScript types from your existing schema definitions.

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

### Coverage Matrix (32 extensions, v3.1)

| Category    | Extension                        |     zod     |   valibot   |   effect    |   arktype   |   typebox   |
| ----------- | -------------------------------- | :---------: | :---------: | :---------: | :---------: | :---------: |
| Common      | `x-error-message`                |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Common      | `x-required-message`             |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Common      | `x-const-message`                |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Common      | `x-enum-message`                 |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Numeric     | `x-minimum-message`              |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Numeric     | `x-maximum-message`              |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Numeric     | `x-exclusiveMinimum-message`     |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Numeric     | `x-exclusiveMaximum-message`     |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Numeric     | `x-multipleOf-message`           |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| String      | `x-minLength-message`            |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| String      | `x-maxLength-message`            |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| String      | `x-pattern-message`              |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-minItems-message`             |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-maxItems-message`             |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-uniqueItems-message`          |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-contains-message`             |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-minContains-message`          |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-maxContains-message`          |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-prefixItems-message`          |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Array       | `x-items-message`                |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-minProperties-message`        |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-maxProperties-message`        |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-additionalProperties-message` |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-propertyNames-message`        |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-patternProperties-message`    |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-dependentRequired-message`    |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-dependentSchemas-message`     |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Object      | `x-properties-message`           |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Combinators | `x-allOf-message`                |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Combinators | `x-anyOf-message`                |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Combinators | `x-oneOf-message`                |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| Combinators | `x-not-message`                  |     ✅      |     ✅      |     ✅      |     ✅      |     ✅      |
| **Total**   |                                  | **32 / 32** | **32 / 32** | **32 / 32** | **32 / 32** | **32 / 32** |

All 5 generators reach **full 32/32 v3.1 parity**. The translation strategy per generator:

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

### Code-emitting extensions (opt-in: `--unsafe-code-extensions`)

> [!CAUTION]
> These extensions accept **raw TypeScript expressions** that are inlined into the generated code. **Never enable them on JSON Schemas fetched from untrusted sources** — a hostile schema can embed any expression that will run during your build/CI/runtime, which is a clean supply-chain attack path. A defense-in-depth denylist (`process` / `require` / `eval` / `Function` / `globalThis` / `constructor` / `__proto__` / browser globals / backticks / `\u`/`\x` escapes / `['…']` computed access) silently drops obviously malicious values, but the only real protection is keeping the input schema inside your own trust boundary.

Enable per-CLI invocation with `--unsafe-code-extensions`; programmatic API users pass `{ unsafeCodeExtensions: true }`. Generated files include a `// @generated-with-unsafe-code-extensions` marker at the top for grep auditing.

Per-library API-name mapping (raw expression values, library-native API names):

| Concept             | Zod            | Valibot       | Effect        | Arktype    | TypeBox |
| ------------------- | -------------- | ------------- | ------------- | ---------- | ------- |
| Custom predicate    | `x-refine`     | `x-check`     | `x-filter`    | `x-narrow` | skip    |
| Transform / morph   | `x-transform`  | `x-transform` | `x-transform` | `x-morph`  | skip    |
| Pipe composition    | `x-pipe`       | `x-pipe`      | `x-pipe`      | `x-pipe`   | skip    |
| Bidirectional codec | `x-codec`      | skip          | skip          | skip       | skip    |
| Preprocess input    | `x-preprocess` | skip          | skip          | skip       | skip    |

Example (Zod, with `--unsafe-code-extensions`):

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

Without the flag the values are silently dropped, and the CLI prints a `stderr` warning so the omission is auditable:

```
[schema-to-library] WARNING: detected code-emitting extensions x-refine but --unsafe-code-extensions is not set; values will be ignored.
```

## License

Distributed under the MIT License. See [LICENSE](https://github.com/nakita628/schema-to-libray?tab=MIT-1-ov-file) for more information.
