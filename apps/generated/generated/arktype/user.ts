import { type } from 'arktype'

export const User = type({
  id: type('string.uuid').describe('Unique identifier for the user'),
  name: type('string >= 1').describe('Name of the user'),
  'age?': type('number.integer >= 0').describe('Age of the user'),
  email: type('string.email').describe('Email address'),
  'isActive?': type('boolean').describe('Whether the user is active'),
  '+': 'reject',
})
