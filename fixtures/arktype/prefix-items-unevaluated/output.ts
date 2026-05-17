import { type } from 'arktype'

export const Tuple = type(['string', 'boolean'])

export type Tuple = typeof Tuple.infer
