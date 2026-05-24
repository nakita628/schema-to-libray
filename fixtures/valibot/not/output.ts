import * as v from 'valibot'

export const NotString = v.custom<unknown>((val) => typeof val !== 'string', 'Must not be a string')

export type NotStringOutput = v.InferOutput<typeof NotString>
