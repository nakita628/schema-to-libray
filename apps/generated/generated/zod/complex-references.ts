import * as z from 'zod'

type FriendType = { name: string; relationship?: string }
type PersonType = {
  name: string
  age: number
  spouse?: PersonType
  children?: PersonType[]
  parent?: PersonType
  siblings?: PersonType[]
  externalFriend?: unknown
  externalFamily?: unknown
}
type EmployeeType = {
  id: string
  name: string
  manager?: EmployeeType
  subordinates?: EmployeeType[]
  person?: PersonType
}
type SchemaType = PersonType

export const Friend: z.ZodType<FriendType> = z.object({
  name: z.string(),
  relationship: z.string().optional(),
})

export const Person: z.ZodType<PersonType> = z.object({
  name: z.string(),
  age: z.number(),
  spouse: z.lazy(() => Person).optional(),
  children: z.array(z.lazy(() => Person)).optional(),
  parent: z.lazy(() => Person).optional(),
  siblings: z.array(z.lazy(() => Person)).optional(),
  externalFriend: z.unknown().optional(),
  externalFamily: z.unknown().optional(),
})

export const Employee: z.ZodType<EmployeeType> = z.object({
  id: z.string(),
  name: z.string(),
  manager: z.lazy(() => Employee).optional(),
  subordinates: z.array(z.lazy(() => Employee)).optional(),
  person: z.lazy(() => Person).optional(),
})

export const Schema: z.ZodType<SchemaType> = z.lazy(() => Person)

export type Schema = z.infer<typeof Schema>
