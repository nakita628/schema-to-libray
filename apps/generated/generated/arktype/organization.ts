import { scope, type } from 'arktype'

const types = scope({
  Member: [
    {
      userId: ['string.uuid', '@', 'The unique identifier of the user.'],
      role: ["'admin' | 'member' | 'guest'", '@', 'The role of the user in the organization.'],
      joinedAt: ['string.date.iso', '@', 'The timestamp when the user joined the organization.'],
      'invitedBy?': ['Member', '@', 'The member who invited this user (recursive reference).'],
      '+': 'reject',
    },
    '@',
    'A person who is a member of the organization.',
  ],
  Organization: [
    {
      id: ['string.uuid', '@', 'The UUID of the organization.'],
      name: type('string >= 1').describe('The name of the organization.'),
      'members?': ['Member[]', '@', 'A list of members belonging to the organization.'],
      'parent?': [
        'Organization',
        '@',
        'An optional reference to a parent organization (recursive).',
      ],
      '+': 'reject',
    },
    '@',
    'A recursive schema representing an organization and its members.',
  ],
}).export()

export const Organization = types.Organization
