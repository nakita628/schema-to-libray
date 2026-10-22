import { DEFAULT_ROOT_NAME, MISSING_DEFINITION_PREFIX } from '../constants/index.js'
import type { JSONSchema, ParamIn, ParamStyle } from '../parser/index.js'
import { toIdentifierPascalCase, toPascalCase } from '../utils/index.js'
import { resolveSchemaDependenciesFromSchema } from './resolve-schema-dependencies-from-schema.js'
import { collectDefinitions } from './schema.js'

/** The options every `schemaTo<Library>` document generator accepts. */
export type GenerateOptions = {
  /** Also export the inferred TypeScript type. Default: `true`. */
  readonly exportType?: boolean
  /** Name schemas as OpenAPI components are named, and resolve `#/components/schemas/` refs. */
  readonly openapi?: boolean
  /** Emit readonly arrays and objects. */
  readonly readonly?: boolean
  /** Honour the code-emitting `x-*` extensions. Unsafe: see `helper/code-extensions.ts`. */
  readonly unsafeCodeExtensions?: boolean
  /** The OpenAPI parameter location the schema is emitted for; its values are coerced from text. */
  readonly paramIn?: ParamIn
  /**
   * The parameter's `style`, which decides how its text is split into an array or an
   * object (`form` with `explode: false` reads `1,2,3`, `deepObject` gathers `deep[key]`).
   * Defaults to `form` for `query` / `cookie` / `formData` and `simple` for `path` / `header`.
   * Applies to the root schema only. Honoured by Zod, Valibot, Effect Schema and ArkType; a
   * no-op for TypeBox, Ajv and Yup.
   */
  readonly style?: ParamStyle
  /**
   * The parameter's `explode`. Defaults to `true` for `style: form`, else `false`. Honoured
   * where `style` is.
   */
  readonly explode?: boolean
  /**
   * The parameter's `allowEmptyValue` — an empty value reads as an absent one. Honoured
   * where `style` is.
   */
  readonly allowEmptyValue?: boolean
  /**
   * The media type of the parameter's `content`. A JSON one (`application/json`, `*+json`)
   * reads the text as a JSON document and validates it without coercion. Honoured where
   * `style` is.
   */
  readonly contentType?: string
}

/** The options threaded through every node emitter: `GenerateOptions` without `exportType`. */
export type EmitOptions = Omit<GenerateOptions, 'exportType'>

/** The node options of a document generation, with the unset parameter options left out. */
export function emitOptionsOf(options: GenerateOptions | undefined): EmitOptions {
  return {
    openapi: options?.openapi ?? false,
    readonly: options?.readonly ?? false,
    unsafeCodeExtensions: options?.unsafeCodeExtensions ?? false,
    ...(options?.paramIn !== undefined && { paramIn: options.paramIn }),
    ...(options?.style !== undefined && { style: options.style }),
    ...(options?.explode !== undefined && { explode: options.explode }),
    ...(options?.allowEmptyValue !== undefined && { allowEmptyValue: options.allowEmptyValue }),
    ...(options?.contentType !== undefined && { contentType: options.contentType }),
  }
}

/**
 * How a document names its schemas. An OpenAPI component name is always made a valid
 * identifier; a plain JSON Schema title keeps its hyphens and underscores for back-compat.
 */
export function schemaNamer(openapi: boolean | undefined): (name: string) => string {
  return openapi === true ? toIdentifierPascalCase : toPascalCase
}

/** The name the root schema is exported under: its `title`, or `fallback`. */
export function rootNameOf(
  schema: JSONSchema,
  toName: (name: string) => string,
  fallback: string = DEFAULT_ROOT_NAME,
): string {
  return schema.title ? toName(schema.title) : fallback
}

/** The comment left where a `$ref` names a definition the document does not hold. */
export function missingDefinitionComment(name: string): string {
  return `${MISSING_DEFINITION_PREFIX}${name}`
}

/** What a document generator has to lay out, read once from the schema. */
export type DocumentPlan = {
  /** The name of the exported root schema. */
  readonly rootName: string
  /** `definitions` and `$defs` as one map. */
  readonly definitions: { readonly [k: string]: JSONSchema }
  /** Whether the map holds anything. */
  readonly hasDefinitions: boolean
  /** Every definition name, in dependency order: a definition after what it refers to. */
  readonly orderedNames: readonly string[]
  /** The definition that shares the root's name, when one does: it *is* the root. */
  readonly rootDefinition: JSONSchema | undefined
  /** `orderedNames` without the root's own definition. */
  readonly nonRootNames: readonly string[]
  /** The schema emitted as the root: `rootDefinition`, else the document itself. */
  readonly root: JSONSchema
}

/**
 * The plan of a document: its definitions in dependency order, and which of them, if
 * any, is the root under another name.
 */
export function planDocument(schema: JSONSchema, rootName: string): DocumentPlan {
  const definitions = collectDefinitions(schema)
  const hasDefinitions = Object.keys(definitions).length > 0
  const orderedNames = hasDefinitions ? resolveSchemaDependenciesFromSchema(schema) : []
  const rootDefinition = definitions[rootName]
  return {
    rootName,
    definitions,
    hasDefinitions,
    orderedNames,
    rootDefinition,
    nonRootNames:
      rootDefinition === undefined
        ? orderedNames
        : orderedNames.filter((name) => name !== rootName),
    root: rootDefinition ?? schema,
  }
}

/**
 * Every non-root definition rendered through `render` and joined as paragraphs, with a
 * comment standing in for a definition the document names but does not hold.
 */
export function renderDefinitions(
  plan: DocumentPlan,
  toName: (name: string) => string,
  render: (definition: JSONSchema, name: string) => string,
): string {
  return plan.nonRootNames
    .map((name) => {
      const definition = plan.definitions[name]
      return definition === undefined
        ? missingDefinitionComment(name)
        : render(definition, toName(name))
    })
    .join('\n\n')
}
