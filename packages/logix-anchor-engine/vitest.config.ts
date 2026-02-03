import { defineConfig, mergeConfig } from 'vitest/config'
import { sharedConfig } from '../../vitest.shared'

export default mergeConfig(
  defineConfig(sharedConfig),
  defineConfig({
    test: {
      environment: 'node',
      include: ['test/**/*.test.ts'],
      // AnchorEngine uses ts-morph and repo-sized fixtures; under turbo parallelism
      // some tests can exceed Vitest's default 5s timeout.
      testTimeout: 20000,
    },
  }),
)
