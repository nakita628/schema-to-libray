import { Schema } from 'effect'

type _A = { readonly id: string; readonly type: 'B' | 'C'; readonly payload: _B | _C }

type _E = {
  readonly label?: string
  readonly reference?: _E
  readonly flags?: readonly string[]
  readonly meta?: { [key: string]: string }
}

type _D = { readonly score: number; readonly extra?: null | _E }

type _B = {
  readonly type: 'B'
  readonly name: string
  readonly detail: _D & { readonly comment?: string }
}

type _C = { readonly type: 'C'; readonly entries: readonly _E[] }

const E: Schema.Schema<_E> = Schema.partial(
  Schema.Struct({
    label: Schema.String,
    reference: Schema.suspend(() => E),
    flags: Schema.Array(Schema.String).pipe(
      Schema.filter((items) => new Set(items).size === items.length),
    ),
    meta: Schema.Record({ key: Schema.String, value: Schema.String }),
  }),
)

const D: Schema.Schema<_D> = Schema.Struct({
  score: Schema.optionalWith(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0), Schema.lessThanOrEqualTo(100)),
    { default: () => 50 },
  ),
  extra: Schema.optional(
    Schema.Union(
      Schema.NullOr(Schema.Null),
      Schema.suspend(() => E),
    ),
  ),
})

const B: Schema.Schema<_B> = Schema.Struct({
  type: Schema.Literal('B'),
  name: Schema.String,
  detail: Schema.extend(
    Schema.suspend(() => D),
    Schema.Struct({ comment: Schema.optionalWith(Schema.String, { default: () => 'N/A' }) }),
  ),
})

const C: Schema.Schema<_C> = Schema.Struct({
  type: Schema.Literal('C'),
  entries: Schema.Array(Schema.suspend(() => E)).pipe(Schema.minItems(1)),
})

export const A: Schema.Schema<_A> = Schema.Struct({
  id: Schema.UUID,
  type: Schema.Literal('B', 'C'),
  payload: Schema.Union(
    Schema.suspend(() => B),
    Schema.suspend(() => C),
  ),
})
