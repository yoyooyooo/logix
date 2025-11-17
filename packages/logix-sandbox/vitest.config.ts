import { defineConfig, mergeConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { sharedConfig } from '../../vitest.shared'

export default mergeConfig(
  defineConfig(sharedConfig),
  defineConfig({
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
            include: ['test/**/*.test.ts'],
            exclude: ['test/browser/**'],
          },
        },
        {
          extends: true,
          test: {
            name: {
              label: 'browser',
              color: 'green',
            },
            include: ['test/browser/**/*.test.ts'],
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
