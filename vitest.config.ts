import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['archive/**', '.archive/**', '**/node_modules/**', '**/dist/**']
  }
})
