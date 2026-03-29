import { Schema } from 'effect'

export const Config = Schema.Record({ key: Schema.String, value: Schema.String })

export type ConfigType = typeof Config.Type
