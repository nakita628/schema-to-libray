import { Schema } from 'effect'

export const Payload = Schema.String

export type PayloadEncoded = typeof Payload.Encoded
