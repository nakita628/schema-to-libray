import { Schema } from 'effect'

export const Season = Schema.Literal('春', '夏', '秋', '冬')

export type SeasonEncoded = typeof Season.Encoded
