import * as v from 'valibot'

export const Schema = v.object({name:v.string(),age:v.optional(v.number())})

export type SchemaInput = v.InferInput<typeof Schema>

export type SchemaOutput = v.InferOutput<typeof Schema>
