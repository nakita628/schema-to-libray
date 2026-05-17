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
import { Type, type Static } from '@sinclair/typebox'

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

## License

Distributed under the MIT License. See [LICENSE](https://github.com/nakita628/schema-to-libray?tab=MIT-1-ov-file) for more information.
