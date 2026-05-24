import { Schema } from 'effect'

export const Mixed = Schema.Record({ key: Schema.String, value: Schema.Unknown }).pipe(
  Schema.filter((o) =>
    Object.entries(o).every(
      ([k, val]) => !new RegExp('^S:').test(k) || Schema.is(Schema.String)(val),
    ),
  ),
  Schema.filter((o) =>
    Object.entries(o).every(
      ([k, val]) => !new RegExp('^I:').test(k) || Schema.is(Schema.Number.pipe(Schema.int()))(val),
    ),
  ),
)

export type MixedEncoded = typeof Mixed.Encoded
