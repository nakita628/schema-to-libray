import { Effect, Schema } from 'effect'

export const User = Schema.Struct({
  id: Schema.String.check(Schema.isUUID()).annotate({
    description: 'Unique identifier for the user',
  }),
  name: Schema.String.check(Schema.isMinLength(1)).annotate({ description: 'Name of the user' }),
  age: Schema.optional(
    Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)).annotate({
      description: 'Age of the user',
    }),
  ),
  email: Schema.String.check(
    Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
  ).annotate({ description: 'Email address' }),
  isActive: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))).annotate({
    description: 'Whether the user is active',
  }),
}).annotate({ parseOptions: { onExcessProperty: 'error' } })
