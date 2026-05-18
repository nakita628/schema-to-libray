import * as v from 'valibot'

type _Organization = {
  id: string
  name: string
  members?: _Member[]
  parent?: v.InferOutput<typeof Organization>
}

type _Member = {
  userId: string
  role: 'admin' | 'member' | 'guest'
  joinedAt: string
  invitedBy?: _Member
}

const Member: v.GenericSchema<_Member> = v.pipe(
  v.strictObject({
    userId: v.pipe(
      v.pipe(v.string(), v.uuid()),
      v.description('The unique identifier of the user.'),
    ),
    role: v.pipe(
      v.picklist(['admin', 'member', 'guest']),
      v.description('The role of the user in the organization.'),
    ),
    joinedAt: v.pipe(
      v.pipe(v.string(), v.isoDateTime()),
      v.description('The timestamp when the user joined the organization.'),
    ),
    invitedBy: v.optional(
      v.pipe(
        v.pipe(
          v.lazy(() => Member),
          v.description('The member who invited this user (recursive reference).'),
        ),
        v.description('The member who invited this user (recursive reference).'),
      ),
    ),
  }),
  v.description('A person who is a member of the organization.'),
)

export const Organization: v.GenericSchema<_Organization> = v.pipe(
  v.strictObject({
    id: v.pipe(v.pipe(v.string(), v.uuid()), v.description('The UUID of the organization.')),
    name: v.pipe(
      v.pipe(v.string(), v.minLength(1)),
      v.description('The name of the organization.'),
    ),
    members: v.optional(
      v.pipe(
        v.array(v.lazy(() => Member)),
        v.description('A list of members belonging to the organization.'),
      ),
    ),
    parent: v.optional(
      v.pipe(
        v.pipe(
          v.lazy(() => Organization),
          v.description('An optional reference to a parent organization (recursive).'),
        ),
        v.description('An optional reference to a parent organization (recursive).'),
      ),
    ),
  }),
  v.description('A recursive schema representing an organization and its members.'),
)
