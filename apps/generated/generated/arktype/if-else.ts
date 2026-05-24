import { type } from 'arktype'

export const Vehicle = type({ type: "'car' | 'truck'" })
  .narrow(
    (o) =>
      !type({ 'type?': "'truck'" }).allows(o) || type({ cargoCapacity: 'number >= 0' }).allows(o),
  )
  .narrow(
    (o) =>
      type({ 'type?': "'truck'" }).allows(o) ||
      type({ passengerCount: 'number.integer >= 1' }).allows(o),
  )
