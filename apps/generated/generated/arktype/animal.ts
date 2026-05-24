import { scope } from 'arktype'

const types = scope({
  Animal: {
    name: type('string').describe('The name of the animal'),
    species: type('string').describe('The species of the animal'),
    'offspring?': type('Animal[]').describe('List of child animals'),
    '+': 'reject',
  }.describe('An animal that can have offspring'),
  Schema: 'Animal',
}).export()

export const Schema = types.Schema
