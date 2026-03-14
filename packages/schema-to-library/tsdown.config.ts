import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts',
    'cli/zod': './src/zod.ts',
    'cli/valibot': './src/valibot.ts',
    'cli/effect': './src/effect.ts',
    'cli/typebox': './src/typebox.ts',
    'cli/arktype': './src/arktype.ts',
    zod: './src/generator/zod/index.ts',
    valibot: './src/generator/valibot/index.ts',
    effect: './src/generator/effect/index.ts',
    typebox: './src/generator/typebox/index.ts',
    arktype: './src/generator/arktype/index.ts',
  },
  format: 'esm',
  dts: true,
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
})
