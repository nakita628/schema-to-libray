import { Schema } from 'effect'

export const Event = Schema.Union(
  Schema.Struct({
    type: Schema.Literal('click'),
    x: Schema.Number.pipe(Schema.int()),
    y: Schema.Number.pipe(Schema.int()),
  }),
  Schema.Struct({ type: Schema.Literal('keypress'), key: Schema.String }),
)

export type EventEncoded = typeof Event.Encoded
