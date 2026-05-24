import { Schema } from 'effect'

type _Schema_ = _Node

type _Node = { readonly name: string; readonly children?: readonly _Node[] }

const Node: Schema.Schema<_Node> = Schema.Struct({
  name: Schema.String,
  children: Schema.optional(Schema.Array(Schema.suspend(() => Node))),
})

export const Schema_: Schema.Schema<_Schema_> = Schema.suspend(() => Node)
