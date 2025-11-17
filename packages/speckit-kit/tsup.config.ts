import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'bin/speckit-kit': 'src/bin/speckit-kit.ts',
  },
  format: ['esm'],
  target: 'es2020',
  platform: 'node',
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: false,
  dts: false,
  external: ['effect', '@effect/platform', '@effect/platform-node', 'open'],
  banner: {
    js: '#!/usr/bin/env node',
  },
})
