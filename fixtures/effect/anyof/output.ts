import { Schema } from 'effect'

export const StringOrNumber = Schema.Union(Schema.String, Schema.Number).annotations({
  message: () => 'Must be string or number',
})

export type StringOrNumberEncoded = typeof StringOrNumber.Encoded
