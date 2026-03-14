import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String,
  email: Schema.String.pipe(Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
})

export type UserType_ = typeof User.Type

export type UserEncoded = typeof User.Encoded
