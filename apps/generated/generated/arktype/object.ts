import { type } from 'arktype'

export const Schema = type({
  'first_name?': 'string',
  'last_name?': 'string',
  'birthday?': 'string.date',
  'address?': type({
    'street_address?': 'string',
    'city?': 'string',
    'state?': 'string',
    'country?': 'string',
  }),
})
