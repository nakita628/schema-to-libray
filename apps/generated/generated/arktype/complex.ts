import { scope } from 'arktype'

const types = scope({
  E: {
    'label?': 'string',
    'reference?': 'E',
    'flags?': type('string[]').narrow(
      (items: unknown[], ctx) => new Set(items).size === items.length,
    ),
    'meta?': { '[string]': 'string' },
  },
  D: { score: 'number.integer >= 0 <= 100', 'extra?': 'null | null | E' },
  B: { type: "'B'", name: 'string', detail: type('D').and({ 'comment?': 'string' }) },
  C: { type: "'C'", entries: type('E[]').and(type('unknown[] >= 1')) },
  A: { id: 'string.uuid', type: "'B' | 'C'", payload: 'B | C' },
}).export()

export const A = types.A
