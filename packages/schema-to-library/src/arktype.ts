#!/usr/bin/env node
import { NodeRuntime, NodeServices } from '@effect/platform-node'
import { Effect } from 'effect'

import pkg from '../package.json' with { type: 'json' }
import { cli } from './cli/index.js'
import { schemaToArktype } from './generator/arktype/index.js'

NodeRuntime.runMain(
  cli({
    name: 'schema-to-arktype',
    generator: schemaToArktype,
    description: 'Generate ArkType schemas from a JSON Schema document',
    version: pkg.version,
  }).pipe(Effect.provide(NodeServices.layer)),
)
