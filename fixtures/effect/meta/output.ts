import { Schema } from 'effect'

export const User = Schema.Struct({
  id: Schema.Number.pipe(Schema.int()).annotations({
    description: 'unique id',
    jsonSchema: { readOnly: true },
  }),
  email: Schema.String.pipe(
    Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
  ).annotations({ description: 'email address', examples: ['a@b.com', 'c@d.com'] }),
  role: Schema.optional(
    Schema.String.annotations({ description: 'legacy role', jsonSchema: { deprecated: true } }),
  ),
}).annotations({
  description: 'A user account',
  examples: [{ id: 1, email: 'a@b.com' }],
  jsonSchema: { externalDocs: { url: 'https://example.com/users' } },
})

export type UserEncoded = typeof User.Encoded
