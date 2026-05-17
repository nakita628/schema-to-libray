import * as v from 'valibot'

export const Row = v.tuple([v.string(), v.boolean()])

export type RowOutput = v.InferOutput<typeof Row>
