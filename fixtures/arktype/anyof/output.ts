import { type } from 'arktype'

export const StringOrNumber = type('string | number')

export type StringOrNumber = typeof StringOrNumber.infer
