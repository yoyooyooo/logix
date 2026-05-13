import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/Vite.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['effect', '@logixjs/core'],
})
