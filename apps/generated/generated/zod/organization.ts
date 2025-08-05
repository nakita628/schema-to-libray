import * as z from 'zod'

type MemberType = {
  userId: string
  role: 'admin' | 'member' | 'guest'
  joinedAt: string
  invitedBy?: MemberType
}
type OrganizationType = {
  id: string
  name: string
  members?: MemberType[]
  parent?: z.infer<typeof Organization>
}

export const Member: z.ZodType<MemberType> = z.strictObject({
  userId: z.uuid(),
  role: z.enum(['admin', 'member', 'guest']),
  joinedAt: z.iso.datetime(),
  invitedBy: z.lazy(() => Member).optional(),
})

export const Organization: z.ZodType<OrganizationType> = z.strictObject({
  id: z.uuid(),
  name: z.string().min(1),
  members: z.array(z.lazy(() => Member)).optional(),
  parent: z.lazy(() => Organization).optional(),
})

export type Organization = z.infer<typeof Organization>
