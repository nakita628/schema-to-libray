import { Schema } from 'effect'

export const Config = Schema.Struct({
  name: Schema.String,
  tags: Schema.Array(Schema.String),
  count: Schema.optional(Schema.Number.pipe(Schema.int())),
})

export type ConfigType = typeof Config.Type
