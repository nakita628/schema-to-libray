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
  userId: Schema.UUID.annotations({ description: 'The unique identifier of the user.' }),
  role: Schema.Literal('admin', 'member', 'guest').annotations({
    description: 'The role of the user in the organization.',
  }),
  joinedAt: Schema.String.pipe(Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)).annotations({
    description: 'The timestamp when the user joined the organization.',
  }),
  invitedBy: Schema.optional(
    Schema.suspend(() => Member)
      .annotations({ description: 'The member who invited this user (recursive reference).' })
      .annotations({ description: 'The member who invited this user (recursive reference).' }),
  ),
}).annotations({ description: 'A person who is a member of the organization.' })

export const Organization: Schema.Schema<_Organization> = Schema.Struct({
  id: Schema.UUID.annotations({ description: 'The UUID of the organization.' }),
  name: Schema.String.pipe(Schema.minLength(1)).annotations({
    description: 'The name of the organization.',
  }),
  members: Schema.optional(
    Schema.Array(Schema.suspend(() => Member)).annotations({
      description: 'A list of members belonging to the organization.',
    }),
  ),
  parent: Schema.optional(
    Schema.suspend(() => Organization)
      .annotations({ description: 'An optional reference to a parent organization (recursive).' })
      .annotations({ description: 'An optional reference to a parent organization (recursive).' }),
  ),
}).annotations({ description: 'A recursive schema representing an organization and its members.' })
