# Schema to Library

```bash
npm install -D schema-to-library
```

## What is schema-to-library?

**[schema-to-library](https://www.npmjs.com/package/schema-to-library)** is a CLI tool that converts JSON Schema into code for validation libraries like Zod,
It helps you automatically generate type-safe validation schemas and TypeScript types from your existing schema definitions.

## Upcoming Support

Support for additional libraries is planned:

- **Valibot**: Coming soon

## Usage



### CLI Usage

```bash
npx schema-to-zod path/to/input.{json,yaml} -o path/to/output.ts
```
-
### Example

input:

```json
{
  "type": "object",
  "properties": {
    "first_name": { "type": "string" },
    "last_name": { "type": "string" },
    "birthday": { "type": "string", "format": "date" },
    "address": {
      "type": "object",
      "properties": {
        "street_address": { "type": "string" },
        "city": { "type": "string" },
        "state": { "type": "string" },
        "country": { "type": "string" }
      }
    }
  }
}
```

output:

```ts
import * as z from 'zod'

export const Schema = z
  .object({
    first_name: z.string(),
    last_name: z.string(),
    birthday: z.iso.date(),
    address: z
      .object({
        street_address: z.string(),
        city: z.string(),
        state: z.string(),
        country: z.string(),
      })
      .partial(),
  })
  .partial()

export type Schema = z.infer<typeof Schema>
```

## License

Distributed under the MIT License. See [LICENSE](https://github.com/nakita628/schema-to-libray?tab=MIT-1-ov-file) for more information.