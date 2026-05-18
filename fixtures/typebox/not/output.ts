// FIXME: JSON Schema `not` is not enforced by this generator; TypeBox v1 has no runtime `Type.Not` and `Value.Check` ignores the keyword (falls back to `Type.Any()`)

import { Type, type Static } from 'typebox'

export const NotString = Type.Any()

export type NotString = Static<typeof NotString>
