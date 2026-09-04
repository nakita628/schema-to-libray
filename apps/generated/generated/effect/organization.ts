import { Schema } from 'effect'

type _Organization = {
  readonly id: string
  readonly name: string
  readonly members?: readonly _Member[]
  readonly parent?: typeof Organization.Type
}

type _Member = {
  readonly userId: string
  readonly role: 'admin' | 'member' | 'guest'
  readonly joinedAt: string
  readonly invitedBy?: _Member
}

const Member: Schema.Schema<_Member> = Schema.Struct({
  userId: Schema.String.check(Schema.isUUID()).annotate({
    description: 'The unique identifier of the user.',
  }),
  role: Schema.Literals(['admin', 'member', 'guest']).annotate({
    description: 'The role of the user in the organization.',
  }),
  joinedAt: Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)).annotate({
    description: 'The timestamp when the user joined the organization.',
  }),
  invitedBy: Schema.optional(
    Schema.suspend(() => Member)
      .annotate({ description: 'The member who invited this user (recursive reference).' })
      .annotate({ description: 'The member who invited this user (recursive reference).' }),
  ),
})
  .annotate({ parseOptions: { onExcessProperty: 'error' } })
  .annotate({ description: 'A person who is a member of the organization.' })

export const Organization: Schema.Schema<_Organization> = Schema.Struct({
  id: Schema.String.check(Schema.isUUID()).annotate({
    description: 'The UUID of the organization.',
  }),
  name: Schema.String.check(Schema.isMinLength(1)).annotate({
    description: 'The name of the organization.',
  }),
  members: Schema.optional(
    Schema.Array(Schema.suspend(() => Member)).annotate({
      description: 'A list of members belonging to the organization.',
    }),
  ),
  parent: Schema.optional(
    Schema.suspend(() => Organization)
      .annotate({ description: 'An optional reference to a parent organization (recursive).' })
      .annotate({ description: 'An optional reference to a parent organization (recursive).' }),
  ),
})
  .annotate({ parseOptions: { onExcessProperty: 'error' } })
  .annotate({ description: 'A recursive schema representing an organization and its members.' })
