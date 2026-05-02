import { type } from 'arktype'

export const Shape = type(type({ kind: "'circle'", radius: 'number' })).or(
  type({ kind: "'rectangle'", width: 'number', height: 'number' }),
)

export type Shape = typeof Shape.infer
