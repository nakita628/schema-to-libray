import { Schema } from 'effect'

export const User = Schema.Struct({
  id: Schema.UUID.annotations({ description: 'Unique identifier for the user' }),
  name: Schema.String.pipe(Schema.minLength(1)).annotations({ description: 'Name of the user' }),
  age: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)).annotations({
      description: 'Age of the user',
    }),
  ),
  email: Schema.String.pipe(
    Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
  ).annotations({ description: 'Email address' }),
  isActive: Schema.optionalWith(Schema.Boolean, { default: () => true }).annotations({
    description: 'Whether the user is active',
  }),
})
