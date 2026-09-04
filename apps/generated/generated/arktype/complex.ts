import { scope, type } from 'arktype'

const types = scope({
  E: {
    'label?': 'string',
    'reference?': 'E',
    'flags?': ['string[]', ':', (items: unknown[], ctx) => new Set(items).size === items.length],
    'meta?': { '[string]': 'string' },
  },
  D: {
    score: type('number.integer >= 0').and(type('number.integer <= 100')),
    'extra?': 'null | null | E',
  },
  B: { type: "'B'", name: 'string', detail: ['D', '&', { 'comment?': 'string' }] },
  C: { type: "'C'", entries: ['E[]', '&', 'unknown[] >= 1'] },
  A: { id: 'string.uuid', type: "'B' | 'C'", payload: 'B | C' },
}).export()

export const A = types.A
