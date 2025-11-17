import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/RuntimeProvider.ts', 'src/Hooks.ts', 'src/Platform.ts', 'src/ReactPlatform.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.js' : '.cjs',
    }
  },
})
