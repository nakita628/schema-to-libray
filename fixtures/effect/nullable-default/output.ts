import { Schema } from 'effect'

export const Profile = Schema.Struct({
  nickname: Schema.optional(Schema.NullOr(Schema.String)),
  age: Schema.optionalWith(Schema.NullOr(Schema.Number.pipe(Schema.int())), {
    default: () => null,
  }),
})

export type ProfileEncoded = typeof Profile.Encoded
