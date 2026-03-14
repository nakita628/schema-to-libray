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

| Flag | Description |
|------|-------------|
| `--export-type` | Include type export in output |
| `-h, --help` | Display help for command |

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

```bash
npx schema-to-zod user.json -o user.ts
```

```ts
import * as z from 'zod'

export const User = z.object({
  name: z.string(),
  email: z.email(),
  age: z.int().min(0).optional(),
})
```

With `--export-type`:

```bash
npx schema-to-zod user.json -o user.ts --export-type
```

```ts
import * as z from 'zod'

export const User = z.object({
  name: z.string(),
  email: z.email(),
  age: z.int().min(0).optional(),
})

export type User = z.infer<typeof User>
```

## License

Distributed under the MIT License. See [LICENSE](https://github.com/nakita628/schema-to-libray?tab=MIT-1-ov-file) for more information.
