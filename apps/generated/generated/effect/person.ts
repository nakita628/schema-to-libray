import { Schema } from 'effect'

type _SelfReferencingEntities = {
  readonly animal?: _Animal
  readonly person?: _Person
  readonly folder?: _Folder
  readonly comment?: _Comment
}

type _Animal = {
  readonly name: string
  readonly species: string
  readonly offspring?: readonly _Animal[]
}

type _Comment = {
  readonly author: string
  readonly text: string
  readonly replies?: readonly _Comment[]
}

type _Folder = { readonly name: string; readonly children?: readonly _Folder[] }

type _Person = {
  readonly name: string
  readonly position: string
  readonly subordinates?: readonly _Person[]
}

const Animal: Schema.Schema<_Animal> = Schema.Struct({
  name: Schema.String,
  species: Schema.String,
  offspring: Schema.optional(Schema.Array(Schema.suspend(() => Animal))),
}).annotate({ parseOptions: { onExcessProperty: 'error' } })

const Comment: Schema.Schema<_Comment> = Schema.Struct({
  author: Schema.String,
  text: Schema.String,
  replies: Schema.optional(Schema.Array(Schema.suspend(() => Comment))),
}).annotate({ parseOptions: { onExcessProperty: 'error' } })

const Folder: Schema.Schema<_Folder> = Schema.Struct({
  name: Schema.String,
  children: Schema.optional(Schema.Array(Schema.suspend(() => Folder))),
}).annotate({ parseOptions: { onExcessProperty: 'error' } })

const Person: Schema.Schema<_Person> = Schema.Struct({
  name: Schema.String,
  position: Schema.String,
  subordinates: Schema.optional(Schema.Array(Schema.suspend(() => Person))),
}).annotate({ parseOptions: { onExcessProperty: 'error' } })

export const SelfReferencingEntities: Schema.Schema<_SelfReferencingEntities> = Schema.Struct({
  animal: Schema.optional(Schema.suspend(() => Animal)),
  person: Schema.optional(Schema.suspend(() => Person)),
  folder: Schema.optional(Schema.suspend(() => Folder)),
  comment: Schema.optional(Schema.suspend(() => Comment)),
})
  .annotate({ parseOptions: { onExcessProperty: 'error' } })
  .annotate({
    description: 'Examples of animal, person, folder, and comment structures with self-references.',
  })
