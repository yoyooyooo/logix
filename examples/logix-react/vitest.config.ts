import { defineConfig, mergeConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import path from 'node:path'
import { sharedConfig } from '../../vitest.shared'

export default mergeConfig(
  defineConfig(sharedConfig),
  defineConfig({
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, './src') },
      ],
    },
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: {
              label: 'unit',
              color: 'cyan',
            },
            environment: 'node',
            include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
            exclude: ['test/browser/**'],
            setupFiles: ['test/setup/logix-dev-lifecycle.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: {
              label: 'browser',
              color: 'green',
            },
            include: ['test/browser/**/*.test.ts', 'test/browser/**/*.test.tsx'],
            setupFiles: ['test/setup/logix-dev-lifecycle.ts'],
            browser: {
              enabled: true,
              provider: playwright(),
              headless: true,
              instances: [
                {
                  browser: 'chromium',
                },
              ],
            },
          },
        },
      ],
    },
  }),
)
