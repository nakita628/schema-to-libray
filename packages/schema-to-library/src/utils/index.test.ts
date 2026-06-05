import { describe, expect, it } from 'vite-plus/test'

import {
  coerceDefault,
  effectError,
  normalizeTypes,
  resolveOpenAPIRef,
  toIdentifierPascalCase,
  toPascalCase,
  valibotError,
  zodError,
} from './index.js'

// Test run
// pnpm vitest run ./src/utils/index.test.ts

describe('helper', () => {
  describe('toPascalCase', () => {
    it('should return the pascal case of the given string', () => {
      expect(toPascalCase('foo')).toBe('Foo')
    })
  })

  describe('normalizeTypes', () => {
    it('should return empty array if type is undefined', () => {
      expect(normalizeTypes(undefined)).toStrictEqual([])
    })

    it('should wrap string type in array', () => {
      expect(normalizeTypes('string')).toStrictEqual(['string'])
    })

    it('should return the array as is if already array', () => {
      expect(normalizeTypes(['string', 'null'])).toStrictEqual(['string', 'null'])
    })

    it('should wrap number type in array', () => {
      expect(normalizeTypes('number')).toStrictEqual(['number'])
    })

    it('should handle "null" as string', () => {
      expect(normalizeTypes('null')).toStrictEqual(['null'])
    })

    it('should handle mixed type array', () => {
      expect(normalizeTypes(['integer', 'null'])).toStrictEqual(['integer', 'null'])
    })
  })

  describe('zodError', () => {
    it('should wrap string message in Zod v4 error format', () => {
      expect(zodError('Name is required')).toBe('{error:"Name is required"}')
    })

    it('should handle message with special characters', () => {
      expect(zodError('Must be 3-20 characters')).toBe('{error:"Must be 3-20 characters"}')
    })

    it('should handle arrow function expression as-is', () => {
      expect(zodError('(val) => `Expected ${val}`')).toBe('{error:(val) => `Expected ${val}`}')
    })

    it('should handle arrow function with spaces', () => {
      expect(zodError('  (val) => val.toString()')).toBe('{error:  (val) => val.toString()}')
    })

    it('should escape quotes in string messages', () => {
      expect(zodError('Must be "valid"')).toBe('{error:"Must be \\"valid\\""}')
    })
  })

  describe('valibotError', () => {
    it('should wrap plain string in JSON.stringify', () => {
      expect(valibotError('Must be valid')).toBe('"Must be valid"')
    })

    it('should pass through arrow function expression', () => {
      expect(valibotError('(issue) => issue.message')).toBe('(issue) => issue.message')
    })

    it('should detect arrow function with spaces', () => {
      expect(valibotError('  (val) => val.toString()')).toBe('  (val) => val.toString()')
    })
  })

  describe('effectError', () => {
    it('should wrap plain string in message annotation', () => {
      expect(effectError('Required field')).toBe('{message:()=>"Required field"}')
    })

    it('should pass through arrow function in message annotation', () => {
      expect(effectError('(issue) => `Error: ${issue}`')).toBe(
        '{message:(issue) => `Error: ${issue}`}',
      )
    })
  })

  describe('toIdentifierPascalCase', () => {
    it.concurrent.each<[string, string]>([
      ['user', 'User'],
      ['userProfile', 'UserProfile'],
      ['user-name', 'UserName'],
      ['hello_world', 'HelloWorld'],
      ['user.name', 'UserName'],
      ['user name', 'UserName'],
      ['123value', '_123Value'],
      ['a-b-c', 'ABC'],
      ['already-PascalCase', 'AlreadyPascalCase'],
      ['', 'Schema'],
      ['---', 'Schema'],
      ['foo--bar', 'FooBar'],
      ['user_name_test', 'UserNameTest'],
      // Additional edge cases
      ['a', 'A'],
      ['ABC', 'ABC'],
      ['123', '_123'],
      ['v2-api-user', 'V2ApiUser'],
      ['com.example.User', 'ComExampleUser'],
      ['foo---bar___baz', 'FooBarBaz'],
      // Non-ASCII names are encoded injectively instead of collapsing to `Schema`
      ['日本語スキーマ', 'U65e5u672cu8a9eu30b9u30adu30fcu30de'],
      ['中文', 'U4e2du6587'],
      ['Схема_Русский', 'U421u445u435u43cu430U420u443u441u441u43au438u439'],
      ['café', 'Cafue9'],
    ])('toIdentifierPascalCase(%s) → %s', (input, expected) => {
      expect(toIdentifierPascalCase(input)).toBe(expected)
    })

    it.concurrent('maps distinct non-ASCII names to distinct identifiers (no collapse)', () => {
      expect(toIdentifierPascalCase('日本語')).not.toBe(toIdentifierPascalCase('中文'))
    })
  })

  describe('resolveOpenAPIRef', () => {
    it.concurrent.each<[string, string | null]>([
      ['#/components/schemas/User', 'UserSchema'],
      ['#/components/schemas/user-profile', 'UserProfileSchema'],
      ['#/components/parameters/UserId', 'UserIdParamsSchema'],
      ['#/components/headers/X-Request-Id', 'XRequestIdHeaderSchema'],
      ['#/components/securitySchemes/Bearer', 'BearerSecurityScheme'],
      ['#/components/requestBodies/CreateUser', 'CreateUserRequestBody'],
      ['#/components/responses/NotFound', 'NotFoundResponse'],
      ['#/components/examples/UserExample', 'UserExampleExample'],
      ['#/components/links/GetUser', 'GetUserLink'],
      ['#/components/callbacks/OnEvent', 'OnEventCallback'],
      ['#/components/pathItems/UserPath', 'UserPathPathItem'],
      ['#/components/mediaTypes/JsonMedia', 'JsonMediaMediaTypeSchema'],
      ['#/definitions/Address', null],
      ['#/$defs/Address', null],
      ['#', null],
      // URL-encoded $ref
      ['#/components/schemas/My%20Schema', 'MySchemaSchema'],
      // Empty component name
      ['#/components/schemas/', 'SchemaSchema'],
      // Non-ASCII component names: a percent-encoded $ref resolves to the same
      // identifier as the decoded name, so declaration and reference stay aligned.
      ['#/components/schemas/中文', 'U4e2du6587Schema'],
      ['#/components/schemas/%E4%B8%AD%E6%96%87', 'U4e2du6587Schema'],
    ])('resolveOpenAPIRef(%s) → %s', (input, expected) => {
      expect(resolveOpenAPIRef(input)).toBe(expected)
    })
  })

  describe('coerceDefault', () => {
    it('drops a composite default on a scalar schema', () => {
      expect(coerceDefault({ type: 'string' }, [])).toStrictEqual({ keep: false, value: [] })
      expect(coerceDefault({ type: 'integer' }, {})).toStrictEqual({ keep: false, value: {} })
    })

    it('keeps a composite default when the schema allows it', () => {
      expect(coerceDefault({ type: 'array' }, [])).toStrictEqual({ keep: true, value: [] })
      expect(coerceDefault({ type: 'object' }, {})).toStrictEqual({ keep: true, value: {} })
      expect(coerceDefault({}, [])).toStrictEqual({ keep: true, value: [] })
    })

    it('drops a null default unless the schema is nullable', () => {
      expect(coerceDefault({ type: 'string' }, null)).toStrictEqual({ keep: false, value: null })
      expect(coerceDefault({ type: 'string', nullable: true }, null)).toStrictEqual({
        keep: true,
        value: null,
      })
    })

    it('coerces stringified booleans for boolean schemas', () => {
      expect(coerceDefault({ type: 'boolean' }, 'true')).toStrictEqual({ keep: true, value: true })
    })
  })
})
