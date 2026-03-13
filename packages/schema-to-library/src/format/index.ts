import { format } from 'oxfmt'

/**
 * Formats TypeScript code using oxfmt.
 *
 * @param input - The TypeScript code string to format.
 * @returns A promise that resolves to a result object.
 */
export async function fmt(
  input: string,
): Promise<
  { readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: string }
> {
  const { code, errors } = await format('<stdin>.ts', input, {
    printWidth: 100,
    singleQuote: true,
    semi: false,
  })
  if (errors.length > 0) {
    return {
      ok: false,
      error: errors.map((e) => e.message).join('\n'),
    }
  }
  return { ok: true, value: code }
}
