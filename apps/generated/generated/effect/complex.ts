import { Effect, Schema } from 'effect'

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

const E: Schema.Schema<_E> = Schema.Struct({
  label: Schema.optional(Schema.String),
  reference: Schema.optional(Schema.suspend(() => E)),
  flags: Schema.optional(Schema.Array(Schema.String).check(Schema.isUnique())),
  meta: Schema.optional(Schema.Record(Schema.String, Schema.String)),
})

const D: Schema.Schema<_D> = Schema.Struct({
  score: Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(100),
  ).pipe(Schema.withDecodingDefault(Effect.succeed(50))),
  extra: Schema.optional(Schema.Union([Schema.NullOr(Schema.Null), Schema.suspend(() => E)])),
})

const B: Schema.Schema<_B> = Schema.Struct({
  type: Schema.Literal('B'),
  name: Schema.String,
  detail: Schema.suspend(() => D).check(
    Schema.makeFilter((v) =>
      Schema.is(
        Schema.Struct({
          comment: Schema.String.pipe(Schema.withDecodingDefault(Effect.succeed('N/A'))),
        }),
      )(v),
    ),
  ),
})

const C: Schema.Schema<_C> = Schema.Struct({
  type: Schema.Literal('C'),
  entries: Schema.Array(Schema.suspend(() => E)).check(Schema.isMinLength(1)),
})

export const A: Schema.Schema<_A> = Schema.Struct({
  id: Schema.String.check(Schema.isUUID()),
  type: Schema.Literals(['B', 'C']),
  payload: Schema.Union([Schema.suspend(() => B), Schema.suspend(() => C)]),
})
