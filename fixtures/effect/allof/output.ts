import { Schema } from 'effect'

export const Combined = Schema.extend(
  Schema.Struct({ name: Schema.String }),
  Schema.Struct({ age: Schema.Number }),
)

export type CombinedType = typeof Combined.Type
