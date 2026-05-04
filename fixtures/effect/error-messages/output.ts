import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String.pipe(
    Schema.pattern(/^[a-zA-Z]+$/, { message: () => 'Only alphabetic characters' }),
    Schema.minLength(3, { message: () => 'Name too short' }),
    Schema.maxLength(20, { message: () => 'Name too long' }),
  ).annotations({ message: () => 'Invalid name' }),
  age: Schema.Number.pipe(
    Schema.int({ message: () => 'Invalid age' }),
    Schema.greaterThanOrEqualTo(0, { message: () => 'Age must be positive' }),
    Schema.lessThanOrEqualTo(120, { message: () => 'Age too large' }),
    Schema.multipleOf(1, { message: () => 'Age must be integer' }),
  ),
  tags: Schema.Array(Schema.String).pipe(Schema.minItems(1), Schema.maxItems(5)),
})

export type UserEncoded = typeof User.Encoded
