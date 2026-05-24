import { Type, type Static } from 'typebox'

const E = Type.Object({
  label: Type.Optional(Type.String()),
  reference: Type.Optional(E),
  flags: Type.Optional(Type.Array(Type.String(), { uniqueItems: true })),
  meta: Type.Optional(Type.Record(Type.String(), Type.String())),
})

const D = Type.Object({
  score: Type.Optional(Type.Integer({ minimum: 0, maximum: 100 }), { default: 50 }),
  extra: Type.Optional(Type.Union([Type.Union([Type.Null(), Type.Null()]), E])),
})

const B = Type.Object({
  type: Type.Literal('B'),
  name: Type.String(),
  detail: Type.Intersect([
    D,
    Type.Object({ comment: Type.Optional(Type.Optional(Type.String(), { default: 'N/A' })) }),
  ]),
})

const C = Type.Object({ type: Type.Literal('C'), entries: Type.Array(E, { minItems: 1 }) })

export const A = Type.Object({
  id: Type.String({ format: 'uuid' }),
  type: Type.Union([Type.Literal('B'), Type.Literal('C')]),
  payload: Type.Union([B, C]),
})
