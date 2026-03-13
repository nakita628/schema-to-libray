import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts',
    zod: './src/zod.ts',
    valibot: './src/valibot.ts',
    effect: './src/effect.ts',
    typebox: './src/typebox.ts',
    arktype: './src/arktype.ts',
  },
  format: 'esm',
  dts: true,
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
})
