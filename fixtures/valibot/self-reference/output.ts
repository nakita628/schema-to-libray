import * as v from 'valibot'

type SchemaType = { children?: v.InferOutput<typeof Schema>[] }

export const Schema: v.GenericSchema<SchemaType> = v.partial(
  v.object({ children: v.array(v.lazy(() => Schema)) }),
)

export type SchemaOutput = v.InferOutput<typeof Schema>
