import * as v from 'valibot'

export const Vehicle = v.pipe(
  v.looseObject({ type: v.picklist(['car', 'truck']) }),
  v.check((o) => {
    const m = v.safeParse(v.partial(v.object({ type: v.literal('truck') })), o).success
    if (m) {
      const r = v.safeParse(v.object({ cargoCapacity: v.pipe(v.number(), v.minValue(0)) }), o)
      if (!r.success) return false
    } else {
      const r = v.safeParse(
        v.object({ passengerCount: v.pipe(v.number(), v.integer(), v.minValue(1)) }),
        o,
      )
      if (!r.success) return false
    }
    return true
  }),
)
