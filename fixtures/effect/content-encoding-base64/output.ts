import { Schema } from 'effect'

export const Image = Schema.String

export type ImageEncoded = typeof Image.Encoded
