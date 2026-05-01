import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/Playground.tsx', 'src/Project.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: [
    '@codesandbox/sandpack-react',
    '@logixjs/core',
    '@logixjs/react',
    '@logixjs/sandbox',
    'effect',
    'react',
    'react-dom',
  ],
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.js' : '.cjs',
    }
  },
})
