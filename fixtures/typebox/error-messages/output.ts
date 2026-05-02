import { Type, type Static } from 'typebox'

export const User = Type.Object({
  name: Type.String({
    pattern: '^[a-zA-Z]+$',
    minLength: 3,
    maxLength: 20,
    errorMessage: 'Invalid name',
  }),
  age: Type.Integer({ minimum: 0, maximum: 120, multipleOf: 1, errorMessage: 'Invalid age' }),
  tags: Type.Array(Type.String(), { minItems: 1, maxItems: 5 }),
})

export type User = Static<typeof User>
