import { defineConfig } from 'tsup'

const requireBanner = `import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
`

export default defineConfig({
  entry: ['src/index.ts', 'src/Commands.ts', 'src/bin/logix.ts', 'src/bin/logix-devserver.ts'],
  format: ['esm'],
  platform: 'node',
  dts: true,
  clean: true,
  // In-workspace development uses TS-source exports for @logixjs/* packages.
  // Bundle them to keep the built `dist/bin/logix.js` runnable under plain Node.js.
  noExternal: [/^@logixjs\//],
  // Some bundled CJS dependencies rely on `require("node:*")` (e.g. fast-glob).
  // The CLI build is ESM (`type: module`), so we must provide `require` via createRequire.
  banner: { js: requireBanner },
})
