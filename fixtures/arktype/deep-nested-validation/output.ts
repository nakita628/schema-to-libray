import { type } from 'arktype'

export const User = type({
  name: type('string >= 1'),
  email: 'string.email',
  'address?': type({ 'city?': 'string', 'zip?': type('string').and(/^\d{3}-\d{4}$/) }),
})

export type User = typeof User.infer
