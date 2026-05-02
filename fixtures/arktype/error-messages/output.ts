import { type } from 'arktype'

export const User = type({
  name: type('string')
    .and(/^[a-zA-Z]+$/)
    .describe('Invalid name'),
  age: type('number.integer >= 0 <= 120 % 1').describe('Invalid age'),
  tags: type('string[]').and(type('1 <= unknown[] <= 5')),
})

export type User = typeof User.infer
