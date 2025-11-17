import { defineConfig } from 'vitest/config'

import { jsToTsResolver } from '../../scripts/vite-js-to-ts-resolver'

export default defineConfig({
  plugins: [jsToTsResolver()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
