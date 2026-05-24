import { Schema } from 'effect'

export const Login = Schema.Struct({
  email: Schema.String.pipe(Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
  password: Schema.String.pipe(Schema.minLength(8)).annotations({
    jsonSchema: { writeOnly: true },
  }),
})

export type LoginEncoded = typeof Login.Encoded
