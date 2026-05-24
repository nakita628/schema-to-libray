import { Schema } from 'effect'

export const Schema_ = Schema.partial(
  Schema.Struct({
    first_name: Schema.String,
    last_name: Schema.String,
    birthday: Schema.String.pipe(Schema.pattern(/^\d{4}-\d{2}-\d{2}$/)),
    address: Schema.partial(
      Schema.Struct({
        street_address: Schema.String,
        city: Schema.String,
        state: Schema.String,
        country: Schema.String,
      }),
    ),
  }),
)
