import * as v from 'valibot'

export const Merged = v.pipe(
  v.unknown(),
  v.rawCheck(({ dataset, addIssue }) => {
    if (!dataset.typed) return
    const valid = v.safeParse(
      v.intersect([
        v.object({ name: v.pipe(v.string(), v.minLength(3, 'name must be at least 3 chars')) }),
        v.object({ age: v.pipe(v.number(), v.integer(), v.minValue(0, 'age must be >= 0')) }),
      ]),
      dataset.value,
    )
    if (!valid.success) {
      for (const issue of valid.issues) {
        addIssue({ message: 'merged validation failed', path: issue.path })
      }
    }
  }),
)

export type MergedOutput = v.InferOutput<typeof Merged>
