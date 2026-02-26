import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/Commands.ts', 'src/bin/logix.ts', 'src/bin/logix-devserver.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  outExtension() {
    return { js: '.js' }
  },
})
