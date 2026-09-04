import { Schema } from 'effect'

export const Mixed = Schema.Record(Schema.String, Schema.Unknown).check(
  Schema.makeFilter((o) =>
    Object.entries(o).every(
      ([k, val]) => !new RegExp('^S:').test(k) || Schema.is(Schema.String)(val),
    ),
  ),
  Schema.makeFilter((o) =>
    Object.entries(o).every(
      ([k, val]) =>
        !new RegExp('^I:').test(k) || Schema.is(Schema.Number.check(Schema.isInt()))(val),
    ),
  ),
)

export type Mixed = typeof Mixed.Type
