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
export type UserInput = v.InferInput<typeof User>
export type UserOutput = v.InferOutput<typeof User>

// Effect Schema
export type UserType_ = typeof User.Type
export type UserEncoded = typeof User.Encoded

// TypeBox
export type User = Static<typeof User>

// Arktype
export type User = typeof User.infer
```

## License

Distributed under the MIT License. See [LICENSE](https://github.com/nakita628/schema-to-libray?tab=MIT-1-ov-file) for more information.
