import { Either, ParseResult, Schema } from 'effect'

export const Merged = Schema.transformOrFail(
  Schema.Unknown,
  Schema.extend(
    Schema.Struct({ name: Schema.String.pipe(Schema.minLength(3)) }),
    Schema.Struct({ age: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)) }),
  ),
  {
    decode: (input, _opts, ast) => {
      const result = Schema.decodeUnknownEither(
        Schema.extend(
          Schema.Struct({ name: Schema.String.pipe(Schema.minLength(3)) }),
          Schema.Struct({ age: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)) }),
        ),
      )(input)
      return Either.isLeft(result)
        ? ParseResult.fail(new ParseResult.Type(ast, input, 'merged validation failed'))
        : ParseResult.succeed(result.right)
    },
    encode: ParseResult.succeed,
  },
)

export type MergedEncoded = typeof Merged.Encoded
