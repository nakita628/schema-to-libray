# schema-to-library Vendor Extensions Registry

JSON Schema vendor extensions (`x-*` prefix) supported by `schema-to-library`.

## Specification Compliance

All extensions follow:

- **JSON Schema 2020-12**: https://json-schema.org/
- **OpenAPI 3.2.0 § 4.9 Vendor Extensions**: https://spec.openapis.org/oas/v3.2.0.html
- **JSON Schema (Japanese reference)**: https://www.tohoho-web.com/ex/json-schema.html

The `x-` prefix is reserved for vendor-specific extensions per OpenAPI spec. None of these extensions are part of the JSON Schema core vocabulary.

## Security Notice — Rejected Extensions

The following extensions were **rejected** after threat-model review (`yor`) and contract-design review (`t-wada`):

| Extension | Status | Reason |
|---|---|---|
| `x-refine` | **REJECTED** | Allows arbitrary JS expression strings in input YAML/JSON; equivalent to `eval` injection |
| `x-superRefine` | **REJECTED** | Same as above; `ctx` access widens attack surface |
| `x-transform` | **REJECTED** | Same as above; arbitrary function body |
| `x-preprocess` | **REJECTED** | Same as above; runs before validation |
| `x-codec` | **REJECTED** | Same as above; both `encode` and `decode` accept arbitrary JS |
| `x-pipe` (with expression strings) | **REJECTED** | Same as above when used with JS expressions |

**Rationale**: No precedent exists in the ecosystem (OpenAPI Generator, AJV, TypeBox, Zod) for accepting JS expression strings from JSON-shaped input. The codegen layer is the correct point to enforce this boundary; downstream defense in Skill runners is impractical.

**Alternative for users who need custom refinement logic**: Write `.refine()` / `.narrow()` / `.check()` in TypeScript after codegen, in an `extend` layer that is statically analyzable.

## Category A: Message Extensions

Override default error messages produced by each validator. All map to the `message` argument of the corresponding constraint API in each target library.

### Top-level

| Extension | Applies to | Status |
|---|---|---|
| `x-error-message` | All schemas (fallback) | ✅ Implemented |
| `x-required-message` | Required properties | ✅ Implemented |
| `x-const-message` | `const` | ✅ Implemented |
| `x-enum-message` | `enum` | ✅ Implemented |

### Numeric (number / integer)

| Extension | Applies to | Status |
|---|---|---|
| `x-minimum-message` | `minimum` | ✅ Implemented |
| `x-maximum-message` | `maximum` | ✅ Implemented |
| `x-exclusiveMinimum-message` | `exclusiveMinimum` | ✅ Implemented |
| `x-exclusiveMaximum-message` | `exclusiveMaximum` | ✅ Implemented |
| `x-multipleOf-message` | `multipleOf` | ✅ Implemented |

### String

| Extension | Applies to | Status |
|---|---|---|
| `x-minLength-message` | `minLength` | ✅ Implemented |
| `x-maxLength-message` | `maxLength` | ✅ Implemented |
| `x-pattern-message` | `pattern` | ✅ Implemented |
| `x-length-message` | Exact length (`minLength === maxLength`) | ✅ Implemented (6 lib, verified 2026-05-17) |

### Array

| Extension | Applies to | Status |
|---|---|---|
| `x-minItems-message` | `minItems` | ✅ Implemented |
| `x-maxItems-message` | `maxItems` | ✅ Implemented |
| `x-uniqueItems-message` | `uniqueItems` | ✅ Implemented |
| `x-contains-message` | `contains` | ✅ Implemented |
| `x-minContains-message` | `minContains` | ✅ Implemented |
| `x-maxContains-message` | `maxContains` | ✅ Implemented |
| `x-size-message` | minItems/maxItems aggregate fallback (proprietary) | ✅ Implemented (proprietary) |

### Object

| Extension | Applies to | Status |
|---|---|---|
| `x-minProperties-message` | `minProperties` | ✅ Implemented |
| `x-maxProperties-message` | `maxProperties` | ✅ Implemented |
| `x-additionalProperties-message` | `additionalProperties` | ✅ Implemented |
| `x-propertyNames-message` | `propertyNames` | ✅ Implemented |
| `x-patternProperties-message` | `patternProperties` | ✅ Implemented |
| `x-dependentRequired-message` | `dependentRequired` | ✅ Implemented |
| `x-dependentSchemas-message` | `dependentSchemas` | ✅ Implemented |

### Combinators

| Extension | Applies to | Status |
|---|---|---|
| `x-allOf-message` | `allOf` | ✅ Implemented |
| `x-anyOf-message` | `anyOf` | ✅ Implemented |
| `x-oneOf-message` | `oneOf` | ✅ Implemented |
| `x-not-message` | `not` | ✅ Implemented |

### Conditional

| Extension | Applies to | Status |
|---|---|---|
| `x-if-message` | `if` | ⚠️ Not yet implemented |
| `x-then-message` | `then` | ⚠️ Not yet implemented |
| `x-else-message` | `else` | ⚠️ Not yet implemented |

### Typeless / Array Applicator

| Extension | Applies to | Status |
|---|---|---|
| `x-properties-message` | `properties` (typeless schemas) | ⚠️ Not yet implemented |
| `x-prefixItems-message` | `prefixItems` | ⚠️ Not yet implemented |
| `x-items-message` | `items` | ⚠️ Not yet implemented |
| `x-unevaluatedProperties-message` | `unevaluatedProperties` | ⚠️ Not yet implemented |
| `x-unevaluatedItems-message` | `unevaluatedItems` | ⚠️ Not yet implemented |

## Category B: Behavior Extensions (Schema-level, declarative)

Boolean or value-typed extensions that map to existing validator APIs. **No JS expression strings**.

### String Pre-validation Transforms

| Extension | Value | Maps to (Zod) | Status |
|---|---|---|---|
| `x-trim` | `true` | `.trim()` | ⚠️ Not yet implemented |
| `x-toLowerCase` | `true` | `.toLowerCase()` | ⚠️ Not yet implemented |
| `x-toUpperCase` | `true` | `.toUpperCase()` | ⚠️ Not yet implemented |
| `x-normalize` | `'NFC'` / `'NFD'` / `'NFKC'` / `'NFKD'` | `.normalize('NFC')` | ⚠️ Not yet implemented |

### Type Coercion

| Extension | Value | Maps to (Zod) | Status |
|---|---|---|---|
| `x-coerce` | `true` | `z.coerce.<type>()` | ⚠️ Not yet implemented |

### Default & Fallback

| Extension | Value | Maps to (Zod) | Status |
|---|---|---|---|
| `x-prefault` | any | `.prefault(value)` | ⚠️ Not yet implemented |
| `x-catch` | any | `.catch(value)` | ⚠️ Not yet implemented |

### Immutability

| Extension | Value | Maps to (Zod) | Status |
|---|---|---|---|
| `x-freeze` | `true` | `.readonly()` | ⚠️ Not yet implemented |

### String Content Checks

| Extension | Value | Maps to (Zod) | Status |
|---|---|---|---|
| `x-startsWith` | string | `.startsWith(...)` | ⚠️ Not yet implemented |
| `x-endsWith` | string | `.endsWith(...)` | ⚠️ Not yet implemented |
| `x-includes` | string | `.includes(...)` | ⚠️ Not yet implemented |

### Format-Specific Options

| Extension | Value | Maps to (Zod) | Status |
|---|---|---|---|
| `x-emailPattern` | `'html5'` / `'browser'` / `'unicode'` | `z.email({ pattern })` | ⚠️ Not yet implemented |
| `x-emailRegex` | regex string | `z.email({ pattern: /.../ })` | ⚠️ Not yet implemented |
| `x-uuidVersion` | `'v1'` / `'v4'` / `'v6'` / `'v7'` / `'v8'` | `z.uuid({ version })` | ⚠️ Not yet implemented |
| `x-urlProtocol` | regex string | `z.url({ protocol: /.../ })` | ⚠️ Not yet implemented |
| `x-urlHostname` | regex string | `z.url({ hostname: /.../ })` | ⚠️ Not yet implemented |
| `x-urlNormalize` | `true` / `false` | `z.url({ normalize })` | ⚠️ Not yet implemented |
| `x-isoPrecision` | number | `z.iso.datetime({ precision })` | ⚠️ Not yet implemented |
| `x-isoOffset` | `true` / `false` | `z.iso.datetime({ offset })` | ⚠️ Not yet implemented |
| `x-isoLocal` | `true` / `false` | `z.iso.datetime({ local })` | ⚠️ Not yet implemented |
| `x-macDelimiter` | `':'` / `'-'` / `'.'` | `z.mac({ delimiter })` | ⚠️ Not yet implemented |
| `x-jwtAlg` | `'HS256'` etc. | `z.jwt({ alg })` | ⚠️ Not yet implemented |
| `x-hashAlg` | `'sha256'` etc. | `z.hash(alg, ...)` | ⚠️ Not yet implemented |
| `x-hashEnc` | `'hex'` / `'base64'` / `'base64url'` | `z.hash(alg, { enc })` | ⚠️ Not yet implemented |

## Cross-library Translation Matrix (Category B preview)

Behavior extensions translate differently across libraries. `❌` indicates the library has no equivalent API.

| Extension | Zod | Valibot | Effect | TypeBox | ArkType | Elysia |
|---|---|---|---|---|---|---|
| `x-trim` | `.trim()` | `v.trim()` (in pipe) | `Schema.Trim` | ❌ runtime | `string.trim` | `t.String` + transform |
| `x-coerce` | `z.coerce.*()` | `v.pipe(v.unknown(), v.transform(...))` | `Schema.NumberFromString` 等 | ❌ runtime | `string.numeric.parse` | `t.Numeric()` |
| `x-prefault` | `.prefault(v)` | `v.optional(s, v)` | `Schema.optional({ default })` | `Default(v)` | `.default(v)` | `t.X({ default: v })` |
| `x-catch` | `.catch(v)` | ❌ (requires try/catch wrap) | `Schema.catchAll` equivalent | ❌ | ❌ | ❌ |
| `x-freeze` | ❌ (no direct API in current Zod) | ❌ | ❌ | ❌ | ❌ | ❌ |
| `x-startsWith` | `.startsWith()` | `v.startsWith()` | `Schema.startsWith` | ❌ runtime | ❌ direct | ❌ direct |
| `x-emailPattern` | `z.email({ pattern })` | `v.email()` | `Schema.Email` | `Format('email')` | `'string.email'` | `t.String({ format: 'email' })` |
| `x-uuidVersion` | `z.uuid({ version })` | `v.uuid()` | `Schema.UUID` | `Format('uuid')` | `'string.uuid'` | `t.String({ format: 'uuid' })` |

**Note**: Unsupported cells (`❌`) should emit a stderr warning during codegen and be applied as no-op. Codegen MUST NOT throw on unsupported extensions per partial-implementation principle.

## Verification

Each extension is verified by the `validate-codegen-*` Skill series. See:

- `.claude/skills/validate-codegen-zod/SKILL.md` — Zod-specific verification
- `.claude/skills/validate-codegen-error-messages/SKILL.md` — Custom message verification across libraries
- (Future) `.claude/skills/validate-codegen-behaviors/SKILL.md` — Behavior extension verification (planned)

## Implementation Status Summary

- **Category A messages**: 28 / 35 implemented (80%)
  - Missing: Conditional 3 (`x-if-message` / `x-then-message` / `x-else-message`), Typeless/Applicator 5 (`x-properties-message` / `x-prefixItems-message` / `x-items-message` / `x-unevaluatedProperties-message` / `x-unevaluatedItems-message`)
- **Category B behaviors**: 0 / 22 implemented (0%)
- **Category C code-string**: REJECTED, will not be implemented

## Change Log

- 2026-05-17 — Initial registry created. Category C rejected via `yor` + `t-wada` review.
