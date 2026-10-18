import { UNICODE_ESCAPE_PATTERN } from '../constants/index.js'

/**
 * Build a JavaScript regular-expression literal from a JSON Schema `pattern`.
 *
 * Escapes unescaped `/` so the literal stays delimited, and adds the `u` flag
 * when the pattern uses Unicode property escapes (`\p{...}`, `\P{...}`,
 * `\u{...}`), which TypeScript requires for those constructs (TS1530). Returns
 * the literal only (`/.../` or `/.../u`); callers append any validator-specific
 * error argument.
 *
 * @example
 * ```ts
 * regexLiteral('^[a-z]+$')      // '/^[a-z]+$/'
 * regexLiteral('^\\p{L}+$')     // '/^\\p{L}+$/u'
 * regexLiteral('a/b')           // '/a\\/b/'
 * ```
 */
export function regexLiteral(pattern: string): string {
  const body = pattern.replaceAll(/(?<!\\)\//gu, '\\/')
  const unicodeFlag = UNICODE_ESCAPE_PATTERN.test(pattern) ? 'u' : ''
  return `/${body}/${unicodeFlag}`
}
