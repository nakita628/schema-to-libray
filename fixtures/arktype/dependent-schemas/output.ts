import { type } from 'arktype'

export const DependentRequired = type({ 'kind?': 'string', 'feature?': 'string' }).narrow(
  (o) => !('kind' in o) || 'feature' in o,
)

export type DependentRequired = typeof DependentRequired.infer
