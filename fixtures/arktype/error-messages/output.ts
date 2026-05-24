import { type } from 'arktype'

export const User = type({
  name: type('string')
    .narrow(
      (s, ctx) => new RegExp('^[a-zA-Z]+$').test(s) || ctx.mustBe('Only alphabetic characters'),
    )
    .describe('Invalid name'),
  age: type('number.integer')
    .narrow((n, ctx) => n >= 0 || ctx.mustBe('Age must be positive'))
    .narrow((n, ctx) => n <= 120 || ctx.mustBe('Age too large'))
    .narrow((n, ctx) => n % 1 === 0 || ctx.mustBe('Age must be integer'))
    .describe('Invalid age'),
  tags: type('string[]')
    .narrow((items: unknown[], ctx) => items.length >= 1 || ctx.mustBe('Need at least one tag'))
    .narrow((items: unknown[], ctx) => items.length <= 5 || ctx.mustBe('Too many tags')),
})

export type User = typeof User.infer
