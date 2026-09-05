import { describe, expect, it } from 'vite-plus/test'

import { runEffect, runEffectError } from '../testing/index.js'
import { parseJson, stringifyJson } from './index.js'

describe('parseJson', () => {
  it('parses an object', async () => {
    expect(await runEffect(parseJson('{"a":1}'))).toStrictEqual({ a: 1 })
  })

  it('fails on invalid JSON', async () => {
    const error = await runEffectError(parseJson('{'))
    expect(error.message.length).toBeGreaterThan(0)
  })
})

describe('stringifyJson', () => {
  it('serialises an object', async () => {
    expect(await runEffect(stringifyJson({ a: 1 }))).toBe('{"a":1}')
  })

  it('fails when the value cannot be serialised', async () => {
    const circular: { self?: unknown } = {}
    circular.self = circular
    const error = await runEffectError(stringifyJson(circular))
    expect(error.message.length).toBeGreaterThan(0)
  })

  it('fails when stringify returns undefined', async () => {
    const error = await runEffectError(stringifyJson(undefined))
    expect(error.message).toBe('JSON.stringify returned undefined')
  })
})
