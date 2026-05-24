import { Schema } from 'effect'

export const Code = Schema.Struct({
  code: Schema.String.pipe(
    Schema.length(6, { message: () => 'Code must be exactly 6 characters' }),
  ),
})

export type CodeEncoded = typeof Code.Encoded
