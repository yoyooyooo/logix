import { defineConfig } from 'tsup'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  entry: ['src/*.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom', 'effect', '@logix/core', '@logix/react'],
  onSuccess: async () => {
    await mkdir(resolve(packageDir, 'dist'), { recursive: true })
    await copyFile(resolve(packageDir, 'src/style.css'), resolve(packageDir, 'dist/style.css'))
  },
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.js' : '.cjs',
    }
  },
})
