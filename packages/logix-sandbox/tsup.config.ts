import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/Client.ts', 'src/Protocol.ts', 'src/Service.ts', 'src/Types.ts', 'src/Vite.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['effect', '@logixjs/core'],
})
