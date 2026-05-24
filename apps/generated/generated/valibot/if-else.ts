import * as v from 'valibot'

export const Vehicle = v.pipe(
  v.looseObject({ type: v.picklist(['car', 'truck']) }),
  v.check(
    (o) =>
      !v.safeParse(v.partial(v.object({ type: v.literal('truck') })), o).success ||
      v.safeParse(v.object({ cargoCapacity: v.pipe(v.number(), v.minValue(0)) }), o).success,
  ),
  v.check(
    (o) =>
      v.safeParse(v.partial(v.object({ type: v.literal('truck') })), o).success ||
      v.safeParse(v.object({ passengerCount: v.pipe(v.number(), v.integer(), v.minValue(1)) }), o)
        .success,
  ),
)
