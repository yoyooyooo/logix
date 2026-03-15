import path from 'node:path'
import { defineConfig, mergeConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { sharedConfig } from '../../vitest.shared'

const browserCollectWarmupFiles = [
  'test/browser/browser-environment-smoke.test.tsx',
  'test/browser/watcher-browser-perf.test.tsx',
  'test/browser/perf-boundaries/**/*.test.ts',
  'test/browser/perf-boundaries/**/*.test.tsx',
]

export default mergeConfig(
  defineConfig(sharedConfig),
  defineConfig({
    // Keep browser-mode cache local to the current worktree so prewarm/collect do not share Vite state.
    cacheDir: path.resolve(__dirname, '.vitest-browser-cache'),
    optimizeDeps: {
      // Pre-discover browser perf suites that collect commonly touches on a fresh worktree.
      entries: browserCollectWarmupFiles,
    },
    server: {
      // Pre-transform the browser perf graph before the real collect run starts.
      warmup: {
        clientFiles: browserCollectWarmupFiles,
      },
    },
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
