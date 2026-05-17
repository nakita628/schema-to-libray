import { Schema } from 'effect'

export const Pair = Schema.Tuple(Schema.String, Schema.Number.pipe(Schema.int()))

export type PairEncoded = typeof Pair.Encoded
