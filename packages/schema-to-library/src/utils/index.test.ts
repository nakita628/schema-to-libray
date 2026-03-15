import { describe, expect, it } from 'vitest'
import {
  effectMessage,
  error,
  normalizeTypes,
  resolveOpenAPIRef,
  toIdentifierPascalCase,
  toPascalCase,
  valibotMessage,
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

  describe('error', () => {
    it('should wrap string message in Zod v4 error format', () => {
      expect(error('Name is required')).toBe('{error:"Name is required"}')
    })

    it('should handle message with special characters', () => {
      expect(error('Must be 3-20 characters')).toBe('{error:"Must be 3-20 characters"}')
    })

    it('should handle arrow function expression as-is', () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal strings as values
      expect(error('(v) => `Expected ${v}`')).toBe('{error:(v) => `Expected ${v}`}')
    })

    it('should handle arrow function with spaces', () => {
      expect(error('  (val) => val.toString()')).toBe('{error:  (val) => val.toString()}')
    })

    it('should escape quotes in string messages', () => {
      expect(error('Must be "valid"')).toBe('{error:"Must be \\"valid\\""}')
    })
  })

  describe('valibotMessage', () => {
    it('should wrap plain string in JSON.stringify', () => {
      expect(valibotMessage('Must be valid')).toBe('"Must be valid"')
    })

    it('should pass through arrow function expression', () => {
      expect(valibotMessage('(issue) => issue.message')).toBe('(issue) => issue.message')
    })

    it('should detect arrow function with spaces', () => {
      expect(valibotMessage('  (val) => val.toString()')).toBe('  (val) => val.toString()')
    })
  })

  describe('effectMessage', () => {
    it('should wrap plain string in message annotation', () => {
      expect(effectMessage('Required field')).toBe('{message:()=>"Required field"}')
    })

    it('should pass through arrow function in message annotation', () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal strings as values
      expect(effectMessage('(issue) => `Error: ${issue}`')).toBe(
        // biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal strings as values
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
    ])('toIdentifierPascalCase(%s) → %s', (input, expected) => {
      expect(toIdentifierPascalCase(input)).toBe(expected)
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
    ])('resolveOpenAPIRef(%s) → %s', (input, expected) => {
      expect(resolveOpenAPIRef(input)).toBe(expected)
    })
  })
})
