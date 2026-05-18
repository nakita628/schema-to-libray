import * as v from 'valibot'

export const Schema = v.partial(
  v.object({
    first_name: v.string(),
    last_name: v.string(),
    birthday: v.pipe(v.string(), v.isoDate()),
    address: v.partial(
      v.object({
        street_address: v.string(),
        city: v.string(),
        state: v.string(),
        country: v.string(),
      }),
    ),
  }),
)
