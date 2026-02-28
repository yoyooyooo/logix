import { defineConfig, mergeConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { sharedConfig } from '../../vitest.shared'

export default mergeConfig(
  defineConfig(sharedConfig),
  defineConfig({
    optimizeDeps: {
      include: [
        'react/jsx-dev-runtime',
        'react',
        'react-dom/client',
        'effect',
        'effect/SchemaAST',
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
