import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { logixReactDevLifecycle } from '@logixjs/react/dev/vite'
import { logixSandboxKernelPlugin } from '../../packages/logix-sandbox/src/Vite'
import { jsToTsResolver } from '../../scripts/vite-js-to-ts-resolver'

export default defineConfig({
  plugins: [logixSandboxKernelPlugin(), logixReactDevLifecycle(), jsToTsResolver(), react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@logixjs\/core$/, replacement: path.resolve(__dirname, '../../packages/logix-core/src/index.ts') },
      { find: /^@logixjs\/react$/, replacement: path.resolve(__dirname, '../../packages/logix-react/src/index.ts') },
      { find: /^@logixjs\/react\/dev\/lifecycle$/, replacement: path.resolve(__dirname, '../../packages/logix-react/src/dev/lifecycle.ts') },
      { find: /^@logixjs\/react\/dev\/vite$/, replacement: path.resolve(__dirname, '../../packages/logix-react/src/dev/vite.ts') },
      { find: /^@logixjs\/react\/dev\/vitest$/, replacement: path.resolve(__dirname, '../../packages/logix-react/src/dev/vitest.ts') },
      { find: /^@logixjs\/form$/, replacement: path.resolve(__dirname, '../../packages/logix-form/src/index.ts') },
      { find: /^@logixjs\/query$/, replacement: path.resolve(__dirname, '../../packages/logix-query/src/index.ts') },
      { find: /^@logixjs\/i18n$/, replacement: path.resolve(__dirname, '../../packages/i18n/src/index.ts') },
      { find: /^@logixjs\/playground$/, replacement: path.resolve(__dirname, '../../packages/logix-playground/src/index.ts') },
      { find: /^@logixjs\/playground\/Playground$/, replacement: path.resolve(__dirname, '../../packages/logix-playground/src/Playground.tsx') },
      { find: /^@logixjs\/playground\/Project$/, replacement: path.resolve(__dirname, '../../packages/logix-playground/src/Project.ts') },
      { find: /^@logixjs\/sandbox$/, replacement: path.resolve(__dirname, '../../packages/logix-sandbox/src/index.ts') },
      { find: /^@logixjs\/sandbox\/vite$/, replacement: path.resolve(__dirname, '../../packages/logix-sandbox/src/Vite.ts') },
      { find: /^@logixjs\/test$/, replacement: path.resolve(__dirname, '../../packages/logix-test/src/index.ts') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  // Workspace packages export TS sources (not prebuilt dist). Excluding them from optimizeDeps
  // makes Vite treat them as source modules so changes are reflected during dev.
  optimizeDeps: {
    exclude: ['@logixjs/core', '@logixjs/react', '@logixjs/form', '@logixjs/query', '@logixjs/i18n', '@logixjs/playground', '@logixjs/sandbox', '@logixjs/test'],
  },
  server: {
    fs: {
      // Allow Vite to read files outside this example folder (workspace packages).
      allow: [path.resolve(__dirname, '..', '..')],
    },
  },
})
