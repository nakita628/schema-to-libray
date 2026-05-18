import { type } from 'arktype'

export const NotString = type('unknown')
  .narrow((val: unknown) => typeof val !== 'string')
  .describe('Must not be a string')

export type NotString = typeof NotString.infer
