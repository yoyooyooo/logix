import { defineConfig } from 'tsup'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  entry: ['src/bin/logix.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  noExternal: ['@logixjs/core'],
  onSuccess: async () => {
    await mkdir(resolve(packageDir, 'dist/schema'), { recursive: true })
    await copyFile(resolve(packageDir, 'src/schema/commands.v1.json'), resolve(packageDir, 'dist/schema/commands.v1.json'))
  },
  outExtension() {
    return { js: '.js' }
  },
})
