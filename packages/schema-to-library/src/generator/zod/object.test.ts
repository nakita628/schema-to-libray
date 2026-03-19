import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../helper/index.js'
import { object } from './object.js'
import { zod } from './zod.js'

// Test run
// pnpm vitest run ./src/zod/object.test.ts

describe('object', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'object' }, 'z.object({})'],
    [
      { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
      'z.object({foo:z.string()})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' }, bar: { type: 'number' } },
        required: ['foo'],
      },
      'z.object({foo:z.string(),bar:z.number().optional()})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' } },
      },
      'z.object({foo:z.string()}).partial()',
    ],
    [
      {
        type: 'object',
        properties: { test: { type: 'string' } },
        required: ['test'],
        additionalProperties: false,
      },
      'z.strictObject({test:z.string()})',
    ],
    [
      {
        type: 'object',
        properties: { test: { type: 'string' } },
        required: ['test'],
        additionalProperties: true,
      },
      'z.looseObject({test:z.string()})',
    ],
    [
      {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
      'z.record(z.string(),z.string())',
    ],
  ])('object(%o) → %s', (input, expected) => {
    expect(object(input, 'Schema', false, zod)).toBe(expected)
  })
})
