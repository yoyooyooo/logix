import { defineConfig, mergeConfig } from 'vitest/config'
import { sharedConfig } from '../../vitest.shared'

export default mergeConfig(
  defineConfig(sharedConfig),
  defineConfig({
    test: {
      environment: 'happy-dom',
      include: ['test/**/*.test.ts', 'test/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
      exclude: ['test/browser/**'],
    },
  }),
)
