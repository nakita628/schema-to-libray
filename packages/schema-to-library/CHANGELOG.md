# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] - 2026-05-29

### Fixed

- Generate injective identifiers for non-ASCII component names. Names that
  previously collapsed to a single `Schema` (e.g. `日本語スキーマ`, `Схема`) are
  now encoded per code point (`u<hex>`), so distinct Unicode-named components no
  longer produce duplicate `export const Schema` declarations. `resolveOpenAPIRef`
  applies the same rule, keeping `$ref` resolution aligned with declarations.
- Add the `u` flag to generated `.regex(...)` literals whose `pattern` uses
  Unicode property escapes (`\p{...}`, `\P{...}`, `\u{...}`), fixing TypeScript
  TS1530. Patterns without Unicode syntax keep their flag-less literal unchanged.
- Emit `z.unknown()` for deep local JSON Pointer `$ref`s that point into a
  sub-schema (e.g. `#/components/schemas/X/properties/Y`) instead of referencing
  an undeclared identifier, fixing TypeScript TS2304. Top-level component `$ref`s
  (`#/components/schemas/Name`) are unaffected.
- Emit `z.tuple(...)` / `z.strictObject(...)` for array/object `enum` members
  instead of `z.literal(...)` (primitive-only in Zod v4), fixing TS2769.
  Primitive and `null` enum members keep their `z.literal(...)` output unchanged.
- Emit `"unknown"` for ArkType `const` whose value is an object or array.
  Composite values cannot be expressed as an ArkType string union, and the
  previous `JSON.stringify` output broke the surrounding quoted type (`found
  Identifier`). Primitive and `null` `const` output is unchanged.
- Wrap object-literal Effect `default` values in parens (`() => ({...})`) so the
  arrow thunk is parsed as an expression, not a block (`semicolon expected`).
  This applies to the `effectWrap` default path used by schema-level defaults.
  Primitive, number, boolean, and array default output is unchanged.

### Note

- **Pure-ASCII output is byte-for-byte unchanged** — only names containing
  non-ASCII characters produce different identifiers than before (the previous
  output for those was broken/duplicated).
