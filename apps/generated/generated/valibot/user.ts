import * as v from 'valibot'

export const User = v.strictObject({
  id: v.pipe(v.pipe(v.string(), v.uuid()), v.description('Unique identifier for the user')),
  name: v.pipe(v.pipe(v.string(), v.minLength(1)), v.description('Name of the user')),
  age: v.optional(
    v.pipe(v.pipe(v.number(), v.integer(), v.minValue(0)), v.description('Age of the user')),
  ),
  email: v.pipe(v.pipe(v.string(), v.email()), v.description('Email address')),
  isActive: v.optional(
    v.pipe(v.optional(v.boolean(), true), v.description('Whether the user is active')),
  ),
})
