import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/*.ts', 'src/dev/*.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.js' : '.cjs',
    }
  },
})
