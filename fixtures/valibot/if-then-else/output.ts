import * as v from 'valibot'

export const Address = v.pipe(
  v.object({ country: v.string(), postalCode: v.optional(v.string()) }),
  v.check((o) => {
    const m = v.safeParse(v.object({ country: v.literal('JP') }), o).success
    if (m) {
      const r = v.safeParse(
        v.object({ postalCode: v.pipe(v.string(), v.regex(/^\d{3}-\d{4}$/)) }),
        o,
      )
      if (!r.success) return false
    } else {
    }
    return true
  }),
)

export type AddressOutput = v.InferOutput<typeof Address>
