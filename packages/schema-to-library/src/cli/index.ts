import path from 'node:path'

import { Console, Effect, Schema, Stdio } from 'effect'
import { Argument, CliError, Command, Flag } from 'effect/unstable/cli'

import { mkdir, writeFile } from '../file/index.js'
import { fmt } from '../format/index.js'
import { isRecord } from '../helper/value.js'
import type { JSONSchema } from '../parser/index.js'
import { parseSchemaFile } from '../parser/index.js'

/** A generator: a JSON Schema in, the TypeScript source of a validation schema out. */
export type Generator = (
  schema: JSONSchema,
  options?: { exportType?: boolean; readonly?: boolean },
) => string

// `Schema.refine` both rejects the value at runtime and narrows the parsed type, so a
// wrong extension never reaches the parser and the ones that do arrive as
// `${string}.json | ${string}.yaml` without a cast. The template literal alone would do
// the same check but reports "Expected a string matching template literal parts";
// wrapping it in `Schema.is` and refining with it is what buys the sentence below.
const InputPathSchema = Schema.String.pipe(
  Schema.refine(
    Schema.is(Schema.TemplateLiteral([Schema.String, Schema.Literals(['.json', '.yaml'])])),
    { message: 'a JSON Schema document ending in .json or .yaml' },
  ),
)

const OutputPathSchema = Schema.String.pipe(
  Schema.refine(Schema.is(Schema.TemplateLiteral([Schema.String, '.ts'])), {
    message: 'a TypeScript file path ending in .ts',
  }),
)

/**
 * The command line every `schema-to-*` binary accepts: what each piece means, and the
 * schema every value is decoded through before {@link generate} ever sees it.
 */
const commandLine = {
  input: Argument.file('input', { mustExist: true }).pipe(
    Argument.withSchema(InputPathSchema),
    Argument.withDescription('JSON Schema document to generate from'),
    Argument.withMetavar('input.{json,yaml}'),
  ),
  // `Flag.string`, not `Flag.file`: the file primitive rewrites its value to an absolute
  // path, and `--output` is echoed back in the "Generated" message, which should read as
  // the path the caller typed.
  output: Flag.string('output').pipe(
    Flag.withAlias('o'),
    Flag.withSchema(OutputPathSchema),
    Flag.withDescription('TypeScript file the generated schema is written to'),
    Flag.withMetavar('output.ts'),
  ),
  // `Flag.boolean` is still a required flag until it is given a default — without this,
  // every invocation is rejected for not passing `--export-type`.
  exportType: Flag.boolean('export-type').pipe(
    Flag.withDescription('Include the inferred type export in the output'),
    Flag.withDefault(false),
  ),
  readonly: Flag.boolean('readonly').pipe(
    Flag.withDescription('Generate readonly types'),
    Flag.withDefault(false),
  ),
} as const

/**
 * Runs one of the library's `{ ok }` functions in the error channel.
 *
 * `Effect.tryPromise` rather than `Effect.promise`: both functions answer with `ok:
 * false` for the failures they expect, but a rejection they did not expect would
 * otherwise become a defect and print a stack trace instead of a sentence.
 */
function attempt<A>(run: () => Promise<{ ok: true; value: A } | { ok: false; error: string }>) {
  return Effect.gen(function* () {
    const result = yield* Effect.tryPromise({
      try: run,
      catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
    })
    if (!result.ok) return yield* Effect.fail(new Error(result.error))
    return result.value
  })
}

/** The bundled document at `input`, or the parser's sentence about why it is not one. */
function readSchema(input: string) {
  return attempt(() => parseSchemaFile(input))
}

/** The formatted source, or the formatter's sentence about why it could not be. */
function format(source: string) {
  return attempt(() => fmt(source))
}

/**
 * The sentence a failure is reported with.
 *
 * `FileSystem` normalises a host failure to `BadResource: FileSystem.writeFile (path)`,
 * which says what could not be done but not why. The Node error it wrapped is kept on
 * `reason.cause` and still carries the `ENOTDIR` / `EISDIR` line, so it is appended
 * whenever there is one.
 */
function describeFailure(error: { readonly message: string }): string {
  const cause = platformCause(error)
  return cause instanceof Error && cause.message !== ''
    ? `${error.message}: ${cause.message}`
    : error.message
}

/** The host error a `PlatformError` wrapped, when it is one and it kept one. */
function platformCause(error: unknown): unknown {
  if (!isRecord(error)) return undefined
  const reason = error.reason
  return isRecord(reason) ? reason.cause : undefined
}

/**
 * Everything the command does once the command line has parsed: read the document,
 * generate, format, and write the file — creating the directories leading to it, so an
 * output under a path that does not exist yet is written rather than refused.
 *
 * Everything past here fails with something carrying a `message`, so the single
 * `mapError` at the end is where all of it turns into rendered CLI output. The
 * `FileSystem` it writes through comes from the environment the caller provides.
 */
function generate(generator: Generator) {
  return (args: Command.Command.Config.Infer<typeof commandLine>) =>
    Effect.gen(function* () {
      const schema = yield* readSchema(args.input)
      const source = yield* format(
        generator(schema, { exportType: args.exportType, readonly: args.readonly }),
      )
      yield* mkdir(path.dirname(args.output))
      yield* writeFile(args.output, source)
      return yield* Console.log(`Generated: ${args.output}`)
    }).pipe(
      // A `CliError` is already something the runner knows how to render. Everything else
      // is a parser, generator or filesystem failure that only carries a sentence.
      Effect.mapError((error) =>
        CliError.isCliError(error)
          ? error
          : new CliError.UserError({ cause: error, userMessage: describeFailure(error) }),
      ),
    )
}

/** What a `schema-to-*` binary has to say about itself. */
export type CliOptions<Name extends string> = {
  /** The binary name, as it appears in usage and error output. */
  readonly name: Name
  /** The generator the command runs. */
  readonly generator: Generator
  /** The one-line description shown at the top of `--help`. */
  readonly description: string
  /** The version `--version` reports. */
  readonly version: string
}

/**
 * The command for one generator: parsing, validation, `--help`, `--version` and shell
 * completions are owned by `effect/unstable/cli`, {@link generate} is the rest.
 *
 * Every binary is the same command with a different name and generator, so they are built
 * from one definition rather than five copies that can drift apart.
 */
export function makeCli<Name extends string>(options: CliOptions<Name>) {
  return Command.make(options.name, commandLine, generate(options.generator)).pipe(
    Command.withDescription(options.description),
    Command.withExamples([
      {
        command: `${options.name} schema.json -o src/schema.ts`,
        description: 'Generate a schema file',
      },
      {
        command: `${options.name} schema.yaml -o src/schema.ts --export-type`,
        description: 'Also export the inferred type',
      },
      {
        command: `${options.name} schema.json -o src/schema.ts --readonly`,
        description: 'Generate readonly types',
      },
    ]),
  )
}

/** Runs a `schema-to-*` command against an explicit argument list. */
export function runCli<Name extends string>(options: CliOptions<Name>, argv: readonly string[]) {
  return Command.runWith(makeCli(options), { version: options.version })(argv)
}

/** The entry point each binary runs, reading its arguments the way `Command.run` does. */
export function cli<Name extends string>(options: CliOptions<Name>) {
  return Effect.gen(function* () {
    const stdio = yield* Stdio.Stdio
    return yield* runCli(options, yield* stdio.args)
  })
}
