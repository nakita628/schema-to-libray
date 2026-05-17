import * as v from 'valibot'

export const Code = v.object({
  code: v.pipe(v.string(), v.length(6, 'Code must be exactly 6 characters')),
})

export type CodeOutput = v.InferOutput<typeof Code>
