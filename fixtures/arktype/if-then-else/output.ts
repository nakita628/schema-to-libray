import { type } from 'arktype'

export const Address = type({ 'country?': 'string' }).narrow((o) =>
  type({ 'country?': "'JP'" }).allows(o)
    ? type({ postalCode: type('string').and(/^[0-9]{3}-[0-9]{4}$/) }).allows(o)
    : true,
)

export type Address = typeof Address.infer
