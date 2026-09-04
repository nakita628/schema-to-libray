import { Schema } from 'effect'

export const Login = Schema.Struct({
  email: Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
  password: Schema.String.check(Schema.isMinLength(8)).annotate({ writeOnly: true }),
})

export type Login = typeof Login.Type
