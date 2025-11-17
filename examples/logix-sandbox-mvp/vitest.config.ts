import path from 'node:path'
import { defineConfig, mergeConfig } from 'vitest/config'
import { sharedConfig } from '../../vitest.shared'

export default mergeConfig(
  defineConfig(sharedConfig),
  defineConfig({
    test: {
      environment: 'node',
      include: ['test/**/*.test.ts'],
      alias: {
        ...(sharedConfig.test.alias ?? {}),
        '@logix/form': path.resolve(__dirname, '../../packages/logix-form/src'),
      },
    },
  }),
)
