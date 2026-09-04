#!/usr/bin/env node
import { NodeRuntime, NodeServices } from '@effect/platform-node'
import { Effect } from 'effect'

import pkg from '../package.json' with { type: 'json' }
import { cli } from './cli/index.js'
import { schemaToEffect } from './generator/effect/index.js'

NodeRuntime.runMain(
  cli({
    name: 'schema-to-effect',
    generator: schemaToEffect,
    description: 'Generate Effect Schema code from a JSON Schema document',
    version: pkg.version,
  }).pipe(Effect.provide(NodeServices.layer)),
)
