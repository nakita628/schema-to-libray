import { Type, type Static } from 'typebox'

const Node = Type.Object(
  { name: Type.String(), children: Type.Optional(Type.Array(Node)) },
  { additionalProperties: false },
)

export const Schema = Node
