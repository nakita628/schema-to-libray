import { Schema } from 'effect'

type _Schema_ = _Animal

type _Animal = {
  readonly name: string
  readonly species: string
  readonly offspring?: readonly _Animal[]
}

const Animal: Schema.Schema<_Animal> = Schema.Struct({
  name: Schema.String.annotations({ description: 'The name of the animal' }),
  species: Schema.String.annotations({ description: 'The species of the animal' }),
  offspring: Schema.optional(
    Schema.Array(Schema.suspend(() => Animal)).annotations({
      description: 'List of child animals',
    }),
  ),
}).annotations({ description: 'An animal that can have offspring' })

export const Schema_: Schema.Schema<_Schema_> = Schema.suspend(() => Animal)
