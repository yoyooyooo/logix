import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { logixSandboxKernelPlugin } from '@logix/sandbox/vite'
import { jsToTsResolver } from '../../scripts/vite-js-to-ts-resolver'
import { transform as esbuildTransform } from 'esbuild'

const normalizeId = (id: string): string => id.split('?')[0].replace(/\\/g, '/')

const isMonacoTsWorker = (id: string): boolean =>
  normalizeId(id).endsWith('/src/components/editor/workers/ts.worker.ts')

const transpileMonacoTsWorkerPlugin = () => {
  return {
    name: 'logix:transpile-monaco-ts-worker',
    enforce: 'pre' as const,
    apply: 'serve' as const,
    async transform(code: string, id: string) {
      if (!isMonacoTsWorker(id)) return
      const sourcefile = normalizeId(id)
      const result = await esbuildTransform(code, {
        loader: 'ts',
        format: 'esm',
        sourcemap: true,
        target: 'esnext',
        sourcefile,
      })
      return { code: result.code, map: result.map }
    },
  }
}

export default defineConfig({
  plugins: [
    jsToTsResolver(),
    transpileMonacoTsWorkerPlugin(),
    react({
      parserConfig: (id) => {
        const normalized = normalizeId(id)
        if (normalized.includes('/node_modules/')) return undefined
        if (isMonacoTsWorker(normalized)) return undefined
        if (id.endsWith('.ts') || id.endsWith('.mts')) return { syntax: 'typescript', tsx: false }
        if (id.endsWith('.tsx')) return { syntax: 'typescript', tsx: true }
        if (id.endsWith('.jsx') || id.endsWith('.mdx')) return { syntax: 'ecmascript', jsx: true }
        return undefined
      },
    }),
    tailwindcss(),
    logixSandboxKernelPlugin(),
  ],
})
