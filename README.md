# Schema to Library

**[schema-to-library](https://www.npmjs.com/package/schema-to-library)** generates type-safe validation schemas from a [JSON Schema](https://json-schema.org/) or [OpenAPI](https://www.openapis.org/) document — one CLI per target library, plus a programmatic API.

## Features

- **Five targets from one document** — [Zod](https://zod.dev/), [Valibot](https://valibot.dev/), [Effect Schema](https://effect.website/docs/schema/introduction/), [TypeBox](https://github.com/sinclairzx81/typebox) and [ArkType](https://arktype.io/), each written in that library's own idiom rather than a lowest common denominator
- **The whole vocabulary** — [Draft 2020-12](https://json-schema.org/draft/2020-12/json-schema-core) through Draft-04: combinators (`allOf` / `anyOf` / `oneOf` / `not`), conditionals (`if` / `then` / `else`), `$defs` / `definitions`, `prefixItems`, `contains`, `patternProperties`, `dependentRequired` / `dependentSchemas`, `unevaluated*`
- **Recursive and circular `$ref`** — self-references and mutual cycles become `z.lazy` / `v.lazy` / `Schema.suspend` / `Type.Cyclic` / `scope`, with the type declaration each library needs to close the loop
- **External `$ref`** — resolved and bundled through [json-schema-ref-parser](https://github.com/APIDevTools/json-schema-ref-parser), so a document split across files generates as one
- **Custom error messages** — [`x-*-message`](#custom-validation-error-messages) vendor extensions, one per JSON Schema keyword, mapped to each library's message API
- **Behaviour extensions** — [`x-*`](#behaviour-extensions) knobs for trimming, coercion, branding and format options, plus an [opt-in escape hatch](#code-extensions-unsafe) for library-specific code
- **Formatted output** — every file is written through [oxfmt](https://github.com/oxc-project/oxc), so generated code lands ready to commit

## Installation

```bash
npm install -D schema-to-library
```

## Usage

### CLI

One binary per target library, each taking the same arguments:

```bash
npx schema-to-zod path/to/input.{json,yaml} -o path/to/output.ts
npx schema-to-valibot path/to/input.{json,yaml} -o path/to/output.ts
npx schema-to-effect path/to/input.{json,yaml} -o path/to/output.ts
npx schema-to-typebox path/to/input.{json,yaml} -o path/to/output.ts
npx schema-to-arktype path/to/input.{json,yaml} -o path/to/output.ts
```

### CLI Reference

`schema-to-zod --help`:

```
DESCRIPTION
  Generate Zod schemas from a JSON Schema document

USAGE
  schema-to-zod [flags] <input>

ARGUMENTS
  input input.{json,yaml}  JSON Schema document to generate from

FLAGS
  --output, -o output.ts    TypeScript file the generated schema is written to
  --export-type             Include the inferred type export in the output
  --readonly                Generate readonly types

GLOBAL FLAGS
  --help, -h                                                          Show help information
  --version, -v                                                       Show version information
  --wizard                                                            Start wizard mode for a command
  --completions <bash|zsh|fish|sh>                                    Print shell completion script (choices: bash, zsh, fish, sh)
  --log-level <all|trace|debug|info|warn|warning|error|fatal|none>    Sets the minimum log level (choices: all, trace, debug, info, warn, warning, error, fatal, none)

EXAMPLES
  # Generate a schema file
  schema-to-zod schema.json -o src/schema.ts

  # Also export the inferred type
  schema-to-zod schema.yaml -o src/schema.ts --export-type

  # Generate readonly types
  schema-to-zod schema.json -o src/schema.ts --readonly
```

The command line, `--help`, `--version` and the shell completions are owned by
[Effect](https://effect.website/)'s CLI, so `<input>` is checked for a `.json` / `.yaml`
extension and for existing, and `-o` for a `.ts` extension, before any generator runs.
Directories leading to the output are created, so `-o src/generated/schema.ts` works
without `mkdir` first.

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

output:

#### [Zod](https://zod.dev/)

```ts
import * as z from 'zod'

export const User = z.object({
  name: z.string(),
  email: z.email(),
  age: z.int().min(0).exactOptional(),
})
```

#### [Valibot](https://valibot.dev/)

```ts
import * as v from 'valibot'

export const User = v.object({
  name: v.string(),
  email: v.pipe(v.string(), v.email()),
  age: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
})
```

#### [Effect Schema](https://effect.website/docs/schema/introduction/)

```ts
import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String,
  email: Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
  age: Schema.optional(Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))),
})
```

#### [TypeBox](https://github.com/sinclairzx81/typebox)

```ts
import { Type, type Static } from 'typebox'

export const User = Type.Object({
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  age: Type.Optional(Type.Integer({ minimum: 0 })),
})
```

#### [ArkType](https://arktype.io/)

```ts
import { type } from 'arktype'

export const User = type({ name: 'string', email: 'string.email', 'age?': 'number.integer >= 0' })
```

With `--export-type`, the inferred type is exported alongside the schema, spelled the way
each library infers it:

```ts
export type User = z.infer<typeof User> // Zod
export type UserOutput = v.InferOutput<typeof User> // Valibot
export type User = typeof User.Type // Effect Schema
export type User = Static<typeof User> // TypeBox
export type User = typeof User.infer // ArkType
```

## Programmatic API

Every generator is also a plain function: a JSON Schema in, the TypeScript source of a
schema out. Import from the package root, or from a per-library subpath when you only
want one.

```ts
import { fmt, parseSchemaFile, schemaToZod } from 'schema-to-library'
// or: import { schemaToZod } from 'schema-to-library/zod'

const parsed = await parseSchemaFile('openapi.yaml')
if (!parsed.ok) throw new Error(parsed.error)

const formatted = await fmt(schemaToZod(parsed.value, { exportType: true }))
if (!formatted.ok) throw new Error(formatted.error)

console.log(formatted.value)
```

| Export                                                           | What it is                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `schemaToZod` / `…Valibot` / `…Effect` / `…Typebox` / `…Arktype` | A whole document to a whole file, `$defs` and all                         |
| `zod` / `valibot` / `effect` / `typebox` / `arktype`             | One schema node to one expression, for composing into your own emitter    |
| `parseSchemaFile`                                                | Reads and bundles a `.json` / `.yaml` document, resolving external `$ref` |
| `fmt`                                                            | Formats generated source with oxfmt                                       |

Both `parseSchemaFile` and `fmt` answer with `{ ok: true, value }` or
`{ ok: false, error }` rather than throwing.

### Options

| Option                 | Default | Effect                                                                                                                                     |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `exportType`           | `true`  | Export the inferred type alongside the schema (the CLI defaults this off; `--export-type` turns it on)                                     |
| `readonly`             | `false` | Generate readonly types                                                                                                                    |
| `openapi`              | `false` | Resolve `#/components/schemas/User` to `UserSchema` — the naming an OpenAPI generator emits — instead of `User`                            |
| `paramIn`              | —       | `'query'` / `'path'` / `'header'` / `'cookie'`. The string-wire locations coerce primitives: see [Parameter coercion](#parameter-coercion) |
| `unsafeCodeExtensions` | `false` | Honour the [code extensions](#code-extensions-unsafe). Not available from the CLI                                                          |

### Parameter coercion

An OpenAPI `query` or `path` parameter arrives as a string, so `paramIn` switches
primitives to their string-wire form:

```ts
schemaToZod(schema, { paramIn: 'query' })
```

```ts
import * as z from 'zod'

export const Query = z.object({
  page: z.coerce.number().int(),
  active: z.stringbool().exactOptional(),
})
```

Set `x-coerce: false` on a property to opt it out.

## Recursive schemas

A `$ref` back to the document (`"$ref": "#"`), or a cycle between definitions, is emitted
as the lazy construct of the target library, with the type declaration each one needs to
close the loop:

```json
{
  "title": "Category",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "children": { "type": "array", "items": { "$ref": "#" } }
  },
  "required": ["name"]
}
```

```ts
// Zod
type _Category = { name: string; children?: z.infer<typeof Category>[] }

export const Category: z.ZodType<_Category> = z.object({
  name: z.string(),
  children: z.array(z.lazy(() => Category)).exactOptional(),
})
```

```ts
// Effect Schema
type _Category = { readonly name: string; readonly children?: readonly (typeof Category.Type)[] }

export const Category: Schema.Schema<_Category> = Schema.Struct({
  name: Schema.String,
  children: Schema.optional(Schema.Array(Schema.suspend(() => Category))),
})
```

TypeBox has no lazy combinator, so a cycle becomes one
[`Type.Cyclic`](https://github.com/sinclairzx81/typebox) map whose members reference each
other by name, and ArkType a [`scope`](https://arktype.io/docs/scopes).

## Vendor Extensions (x-\*)

`x-*` vendor extensions on your JSON Schema customize the generated code. Each maps to a
feature of the target library, and one that a library has no equivalent for is a no-op
there rather than an error.

### Custom Validation Error Messages

Attach custom messages with **one extension per JSON Schema keyword** (1:1 mapping). The
name follows `x-<jsonSchemaKeyword>-message`, plus five generic forms:
`x-error-message`, `x-required-message`, `x-const-message`, `x-enum-message` and
`x-length-message`. Precedence is keyword-specific, then `x-error-message`, then the
library's own default.

```yaml
name:
  type: string
  minLength: 1
  maxLength: 50
  x-error-message: 'Name must be a string'
  x-minLength-message: 'Name cannot be empty'
  x-maxLength-message: 'Name must be at most 50 characters'
```

```ts
// Zod
z.string({ error: 'Name must be a string' })
  .min(1, { error: 'Name cannot be empty' })
  .max(50, { error: 'Name must be at most 50 characters' })
```

```ts
// Valibot
v.pipe(
  v.string('Name must be a string'),
  v.minLength(1, 'Name cannot be empty'),
  v.maxLength(50, 'Name must be at most 50 characters'),
)
```

```ts
// Effect Schema
Schema.String.check(
  Schema.isMinLength(1, { message: 'Name cannot be empty' }),
  Schema.isMaxLength(50, { message: 'Name must be at most 50 characters' }),
).annotate({ message: 'Name must be a string' })
```

#### Common (any schema type)

| Extension            | Applies to                                                       |
| -------------------- | ---------------------------------------------------------------- |
| `x-error-message`    | All schemas (fallback when a keyword-specific message is absent) |
| `x-required-message` | Required properties                                              |
| `x-const-message`    | `const`                                                          |
| `x-enum-message`     | `enum`                                                           |

#### Numeric (number / integer)

| Extension                    | Applies to         |
| ---------------------------- | ------------------ |
| `x-minimum-message`          | `minimum`          |
| `x-maximum-message`          | `maximum`          |
| `x-exclusiveMinimum-message` | `exclusiveMinimum` |
| `x-exclusiveMaximum-message` | `exclusiveMaximum` |
| `x-multipleOf-message`       | `multipleOf`       |

#### String

| Extension             | Applies to                                 |
| --------------------- | ------------------------------------------ |
| `x-minLength-message` | `minLength`                                |
| `x-maxLength-message` | `maxLength`                                |
| `x-pattern-message`   | `pattern`                                  |
| `x-length-message`    | Exact length (`minLength` === `maxLength`) |

#### Array

| Extension               | Applies to    |
| ----------------------- | ------------- |
| `x-minItems-message`    | `minItems`    |
| `x-maxItems-message`    | `maxItems`    |
| `x-uniqueItems-message` | `uniqueItems` |
| `x-contains-message`    | `contains`    |
| `x-minContains-message` | `minContains` |
| `x-maxContains-message` | `maxContains` |

#### Object

| Extension                        | Applies to             |
| -------------------------------- | ---------------------- |
| `x-minProperties-message`        | `minProperties`        |
| `x-maxProperties-message`        | `maxProperties`        |
| `x-additionalProperties-message` | `additionalProperties` |
| `x-propertyNames-message`        | `propertyNames`        |
| `x-patternProperties-message`    | `patternProperties`    |
| `x-dependentRequired-message`    | `dependentRequired`    |
| `x-dependentSchemas-message`     | `dependentSchemas`     |

#### Combinators

| Extension               | Applies to                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `x-allOf-message`       | `allOf`                                                                                                          |
| `x-anyOf-message`       | `anyOf`                                                                                                          |
| `x-oneOf-message`       | `oneOf`                                                                                                          |
| `x-not-message`         | `not`                                                                                                            |
| `x-implication-message` | Implication pattern (`A → B`) encoded as `anyOf:[{not:A},{required:B}]`; takes precedence over `x-anyOf-message` |

#### Conditional

| Extension        | Applies to |
| ---------------- | ---------- |
| `x-if-message`   | `if`       |
| `x-then-message` | `then`     |
| `x-else-message` | `else`     |

#### Typeless / Array Applicator

| Extension                         | Applies to                      |
| --------------------------------- | ------------------------------- |
| `x-properties-message`            | `properties` (typeless schemas) |
| `x-prefixItems-message`           | `prefixItems`                   |
| `x-items-message`                 | `items`                         |
| `x-unevaluatedProperties-message` | `unevaluatedProperties`         |
| `x-unevaluatedItems-message`      | `unevaluatedItems`              |

### Behaviour Extensions

#### String transforms and checks

| Extension       | Value                                   | Portable across      |
| --------------- | --------------------------------------- | -------------------- |
| `x-trim`        | `true`                                  | Zod, Valibot, Effect |
| `x-toLowerCase` | `true`                                  | Zod, Valibot, Effect |
| `x-toUpperCase` | `true`                                  | Zod, Valibot, Effect |
| `x-normalize`   | `'NFC'` / `'NFD'` / `'NFKC'` / `'NFKD'` | Zod, Valibot         |
| `x-lowercase`   | `true` (validation, not transform)      | Zod                  |
| `x-uppercase`   | `true` (validation, not transform)      | Zod                  |
| `x-startsWith`  | prefix                                  | Zod, Valibot, Effect |
| `x-endsWith`    | suffix                                  | Zod, Valibot, Effect |
| `x-includes`    | substring                               | Zod, Valibot, Effect |

`x-lowercase` / `x-uppercase` check that the input already is that case; pair them with
`x-toLowerCase` / `x-toUpperCase` to normalize first and then assert.

#### Coercion and fallback

| Extension      | Generated                                                                       |
| -------------- | ------------------------------------------------------------------------------- |
| `x-coerce`     | `z.coerce.<type>` — also opts a property out of `paramIn` coercion when `false` |
| `x-stringbool` | `z.stringbool()`; an object configures `truthy` / `falsy` / `case` / `error`    |
| `x-prefault`   | `z.string().prefault(value)`                                                    |
| `x-catch`      | `z.int().catch(value)`                                                          |
| `x-fallback`   | `v.fallback(schema, value)` (Valibot)                                           |
| `x-readonly`   | `.readonly()` on an array or object                                             |

#### Format options

Zod exposes options on its format validators; these extensions fill them in.

| Extension        | Maps to                         | Values                                                |
| ---------------- | ------------------------------- | ----------------------------------------------------- |
| `x-emailPattern` | `z.email({ pattern })`          | `html5` / `browser` / `unicode`                       |
| `x-emailRegex`   | `z.email({ pattern: /.../ })`   | custom regex string                                   |
| `x-uuidVersion`  | `z.uuid({ version })`           | `v1` / `v2` / `v3` / `v4` / `v5` / `v6` / `v7` / `v8` |
| `x-urlProtocol`  | `z.url({ protocol: /.../ })`    | regex string                                          |
| `x-urlHostname`  | `z.url({ hostname: /.../ })`    | regex string                                          |
| `x-urlNormalize` | `z.url({ normalize })`          | `true` / `false`                                      |
| `x-isoPrecision` | `z.iso.datetime({ precision })` | fractional second digits                              |
| `x-isoOffset`    | `z.iso.datetime({ offset })`    | `true` / `false`                                      |
| `x-isoLocal`     | `z.iso.datetime({ local })`     | `true` / `false`                                      |
| `x-macDelimiter` | `z.mac({ delimiter })`          | `:` / `-` / `.`                                       |
| `x-jwtAlg`       | `z.jwt({ alg })`                | `HS256` etc.                                          |
| `x-hashAlg`      | `z.hash(alg, ...)`              | `sha1` / `sha256` / `sha384` / `sha512` / `md5`       |
| `x-hashEnc`      | `z.hash(alg, { enc })`          | `hex` / `base64` / `base64url`                        |

### Branded Types (x-brand)

`x-brand` generates a nominal type — structurally identical, semantically distinct —
using each library's branding API:

```yaml
UserId:
  type: string
  format: uuid
  x-brand: UserId
```

```ts
z.uuid().brand<'UserId'>() // Zod
v.pipe(v.pipe(v.string(), v.uuid()), v.brand('UserId')) // Valibot
Schema.String.check(Schema.isUUID()).pipe(Schema.brand('UserId')) // Effect Schema
```

### Code Extensions (unsafe)

The escape hatch: an extension whose value is a **complete expression fragment in the
target library**, appended to the generated schema verbatim. These are only honoured by
the programmatic API with `{ unsafeCodeExtensions: true }`, are never available from the
CLI, and are checked against a denylist before being emitted. **Do not enable them for a
document you do not control** — the value ends up in your source.

Each library reads its own set, and the value is written in that library's own shape.
For Zod, Effect Schema and ArkType the value is a **method chain fragment** appended to
the schema; for Valibot it is a **pipe action** added to `v.pipe(...)`.

| Library                                                           | Extensions                          | The value is                                |
| ----------------------------------------------------------------- | ----------------------------------- | ------------------------------------------- |
| [Zod](https://zod.dev/)                                           | `x-refine`, `x-transform`, `x-pipe` | a chain fragment: `.refine(...)`            |
| [Zod](https://zod.dev/)                                           | `x-codec`, `x-preprocess`           | a whole expression that replaces the schema |
| [Valibot](https://valibot.dev/)                                   | `x-check`, `x-transform`, `x-pipe`  | a pipe action: `v.check(...)`               |
| [Effect Schema](https://effect.website/docs/schema/introduction/) | `x-filter`, `x-transform`, `x-pipe` | a chain fragment: `.check(...)`             |
| [ArkType](https://arktype.io/)                                    | `x-narrow`, `x-morph`, `x-pipe`     | a chain fragment: `.narrow(...)`            |

```ts
schemaToZod(schema, { unsafeCodeExtensions: true })
```

```yaml
password:
  type: string
  x-refine: '.refine((v) => v.length >= 8, { error: "Too short" })'
```

```ts
// @generated-with-unsafe-code-extensions

import * as z from 'zod'

export const Password = z.object({
  password: z.string().refine((v) => v.length >= 8, { error: 'Too short' }),
})
```

A file that used one is marked with `// @generated-with-unsafe-code-extensions` at the
top, so review can find it.

## Related

- **[Hono Takibi](https://github.com/nakita628/hono-takibi)** — generates [Hono](https://hono.dev/) code from OpenAPI / [TypeSpec](https://typespec.io/)
- **[Hekireki](https://github.com/nakita628/hekireki)** — generates validation schemas, ORM models and ER diagrams from a [Prisma](https://www.prisma.io/) schema

## Contributing

We welcome feedback and contributions to improve the tool!

If you find any issues with the generated code or have suggestions for improvements, please:

- Open an issue at [GitHub Issues](https://github.com/nakita628/schema-to-libray/issues)
- Submit a pull request with your improvements

## License

Distributed under the MIT License. See [LICENSE](https://github.com/nakita628/schema-to-libray?tab=MIT-1-ov-file) for more information.
