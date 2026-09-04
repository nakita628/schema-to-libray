import { Schema } from 'effect'

export const Code = Schema.Struct({
  code: Schema.String.check(
    Schema.isLengthBetween(6, 6, { message: 'Code must be exactly 6 characters' }),
  ),
})

export type Code = typeof Code.Type
