import { type } from 'arktype'

export const NotString = type('unknown')
  .narrow((v: unknown) => typeof v !== 'string')
  .describe('Must not be a string')

export type NotString = typeof NotString.infer
