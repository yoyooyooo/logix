import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/Parser.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
})

