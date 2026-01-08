import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import fs from 'fs'

interface ViteDevServer {
  middlewares: {
    use: (fn: (req: any, res: any, next: () => void) => void) => void
  }
}

export interface VitePlugin {
  name: string
  enforce?: 'pre' | 'post'
  configResolved?: () => void
  configureServer?: (server: ViteDevServer) => void
  // Declare only the minimal `this` shape used by generateBundle to avoid pulling in Vite type dependencies.
  generateBundle?: (this: { emitFile: (file: any) => void }) => void
}

export interface LogixSandboxKernelPluginOptions {
  /**
   * HTTP mount path for the kernel bundle.
   * Default: /sandbox/logix-core.js
   */
  readonly mountPath?: string
  /**
   * HTTP mount path for the effect bundle.
   * Default: /effect.js in the same directory as mountPath
   * Example: mountPath=/sandbox/logix-core.js -> /sandbox/effect.js
   */
  readonly effectPath?: string
  /**
   * HTTP mount path for esbuild.wasm.
   * Default: /esbuild.wasm
   */
  readonly wasmPath?: string
}

/**
 * logixSandboxKernelPlugin
 *
 * Only for Vite projects:
 * - dev: serve effect.js / logix-core.js / esbuild.wasm on-demand from @logixjs/sandbox's public directory
 * - build: emit those files as static assets into the build output
 */
export function logixSandboxKernelPlugin(options: LogixSandboxKernelPluginOptions = {}): VitePlugin {
  const mountPath = options.mountPath ?? '/sandbox/logix-core.js'
  const effectPath = options.effectPath ?? mountPath.replace(/\/[^/]*$/, '/effect.js')
  const wasmPath = options.wasmPath ?? '/esbuild.wasm'

  let kernelFile = ''
  let effectFile = ''
  let wasmFile = ''
  let sandboxDir = ''

  const getThisDir = (): string => {
    // Prefer __dirname in CJS to avoid import.meta being undefined.
    // eslint-disable-next-line no-undef
    if (typeof __dirname === 'string') {
      // eslint-disable-next-line no-undef
      return __dirname
    }
    return dirname(fileURLToPath(import.meta.url))
  }

  const resolveFiles = () => {
    if (kernelFile && effectFile && wasmFile && sandboxDir) {
      return
    }
    const thisDir = getThisDir()

    const candidates = [
      resolve(thisDir, '../public'),
      resolve(thisDir, '../../public'),
      resolve(thisDir, '../../../public'),
    ]
    for (const publicDir of candidates) {
      const candidateSandboxDir = resolve(publicDir, 'sandbox')
      const candidateKernelFile = resolve(candidateSandboxDir, 'logix-core.js')
      const candidateEffectFile = resolve(candidateSandboxDir, 'effect.js')
      const candidateWasmFile = resolve(publicDir, 'esbuild.wasm')

      if (
        fs.existsSync(candidateKernelFile) &&
        fs.existsSync(candidateEffectFile) &&
        fs.existsSync(candidateWasmFile)
      ) {
        sandboxDir = candidateSandboxDir
        kernelFile = candidateKernelFile
        effectFile = candidateEffectFile
        wasmFile = candidateWasmFile
        return
      }
    }

    throw new Error(`[logix-sandbox-kernel] 无法定位 public/sandbox 资源目录：${candidates.join(', ')}`)
  }

  return {
    name: 'logix-sandbox-kernel',
    enforce: 'pre',
    configResolved() {
      resolveFiles()
    },
    configureServer(server) {
      resolveFiles()

      server.middlewares.use((req, res, next) => {
        if (!req.url) {
          return next()
        }

        const urlPath = req.url.split('?')[0]
        if (!urlPath) {
          return next()
        }

        const mountDirPath = mountPath.replace(/\/[^/]*$/, '')
        // Static assets under sandboxDir: logix-core/effect/effect/*/chunks/*/@effect/*, etc.
        if (urlPath.startsWith(`${mountDirPath}/`)) {
          const relative = urlPath.slice(mountDirPath.length) // /...
          const filePath = resolve(sandboxDir, `.${relative}`)
          if (!filePath.startsWith(sandboxDir) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            return next()
          }
          if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json')
          } else {
            res.setHeader('Content-Type', 'application/javascript')
          }
          fs.createReadStream(filePath).pipe(res)
          return
        }

        if (urlPath === wasmPath) {
          res.setHeader('Content-Type', 'application/wasm')
          fs.createReadStream(wasmFile).pipe(res)
          return
        }

        next()
      })
    },
    generateBundle() {
      resolveFiles()

      const mountDirPath = mountPath.replace(/\/[^/]*$/, '')
      const mountDirName = mountDirPath.replace(/^\//, '')
      const wasmFileName = wasmPath.replace(/^\//, '')

      // Emit all files under sandboxDir (logix-core/effect/effect/*/chunks/*) into the build output.
      const walk = (dir: string): Array<string> => {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        const files: Array<string> = []
        for (const entry of entries) {
          const abs = resolve(dir, entry.name)
          if (entry.isDirectory()) {
            files.push(...walk(abs))
          } else if (entry.isFile()) {
            files.push(abs)
          }
        }
        return files
      }

      for (const absFile of walk(sandboxDir)) {
        const rel = absFile.slice(sandboxDir.length + 1).replaceAll('\\', '/')
        const fileName = mountDirName ? `${mountDirName}/${rel}` : rel
        this.emitFile({
          type: 'asset',
          fileName,
          source: fs.readFileSync(absFile),
        })
      }

      this.emitFile({
        type: 'asset',
        fileName: wasmFileName,
        source: fs.readFileSync(wasmFile),
      })
    },
  }
}
