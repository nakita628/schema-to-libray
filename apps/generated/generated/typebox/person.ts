import { Type, type Static } from 'typebox'

const Animal = Type.Object(
  { name: Type.String(), species: Type.String(), offspring: Type.Optional(Type.Array(Animal)) },
  { additionalProperties: false },
)

const Comment = Type.Object(
  { author: Type.String(), text: Type.String(), replies: Type.Optional(Type.Array(Comment)) },
  { additionalProperties: false },
)

const Folder = Type.Object(
  { name: Type.String(), children: Type.Optional(Type.Array(Folder)) },
  { additionalProperties: false },
)

const Person = Type.Object(
  { name: Type.String(), position: Type.String(), subordinates: Type.Optional(Type.Array(Person)) },
  { additionalProperties: false },
)

export const SelfReferencingEntities = Type.Object(
  {
    animal: Type.Optional(Animal),
    person: Type.Optional(Person),
    folder: Type.Optional(Folder),
    comment: Type.Optional(Comment),
  },
  {
    additionalProperties: false,
    description: 'Examples of animal, person, folder, and comment structures with self-references.',
  },
)
