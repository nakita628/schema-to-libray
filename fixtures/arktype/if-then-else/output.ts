import { type } from 'arktype'

export const Address = type({ 'country?': 'string' })

export type Address = typeof Address.infer
