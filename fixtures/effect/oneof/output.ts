import { Schema } from 'effect'

export const Shape = Schema.Union(
  Schema.Struct({ kind: Schema.Literal('circle'), radius: Schema.Number }),
  Schema.Struct({ kind: Schema.Literal('rectangle'), width: Schema.Number, height: Schema.Number }),
)

export type ShapeEncoded = typeof Shape.Encoded
