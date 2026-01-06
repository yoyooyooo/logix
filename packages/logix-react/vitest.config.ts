import { defineConfig, mergeConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { sharedConfig } from '../../vitest.shared'

export default mergeConfig(
  defineConfig(sharedConfig),
  defineConfig({
    test: {
      // Default project: keep the existing happy-dom environment for unit / hooks / integration tests.
      projects: [
        {
          extends: true,
          test: {
            name: {
              label: 'unit',
              color: 'cyan',
            },
            environment: 'happy-dom',
            include: ['test/**/*.test.tsx', 'test/**/*.test.ts'],
            exclude: ['test/browser/**'],
          },
        },
        {
          // Browser project: run integration tests in a real browser environment only.
          extends: true,
          test: {
            name: {
              label: 'browser',
              color: 'green',
            },
            include: ['test/browser/**/*.test.tsx', 'test/browser/**/*.test.ts'],
            browser: {
              enabled: true,
              provider: playwright({
                launchOptions: {
                  args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
                },
              }),
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
