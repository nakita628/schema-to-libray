import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String.check(
    Schema.isPattern(/^[a-zA-Z]+$/, { message: 'Only alphabetic characters' }),
    Schema.isMinLength(3, { message: 'Name too short' }),
    Schema.isMaxLength(20, { message: 'Name too long' }),
  ).annotate({ message: 'Invalid name' }),
  age: Schema.Number.check(
    Schema.isInt({ message: 'Invalid age' }),
    Schema.isGreaterThanOrEqualTo(0, { message: 'Age must be positive' }),
    Schema.isLessThanOrEqualTo(120, { message: 'Age too large' }),
    Schema.isMultipleOf(1, { message: 'Age must be integer' }),
  ),
  tags: Schema.Array(Schema.String).check(
    Schema.isMinLength(1, { message: 'Need at least one tag' }),
    Schema.isMaxLength(5, { message: 'Too many tags' }),
  ),
})

export type User = typeof User.Type
