import { scope } from 'arktype'

const types = scope({
  Member: {
    userId: type('string.uuid').describe('The unique identifier of the user.'),
    role: type("'admin' | 'member' | 'guest'").describe(
      'The role of the user in the organization.',
    ),
    joinedAt: type('string.date.iso').describe(
      'The timestamp when the user joined the organization.',
    ),
    'invitedBy?': type('Member').describe(
      'The member who invited this user (recursive reference).',
    ),
    '+': 'reject',
  }.describe('A person who is a member of the organization.'),
  Organization: {
    id: type('string.uuid').describe('The UUID of the organization.'),
    name: type('string >= 1').describe('The name of the organization.'),
    'members?': type('Member[]').describe('A list of members belonging to the organization.'),
    'parent?': type('Organization').describe(
      'An optional reference to a parent organization (recursive).',
    ),
    '+': 'reject',
  }.describe('A recursive schema representing an organization and its members.'),
}).export()

export const Organization = types.Organization
