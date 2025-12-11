import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
import fs from "fs"

interface ViteDevServer {
  middlewares: {
    use: (fn: (req: any, res: any, next: () => void) => void) => void
  }
}

interface VitePlugin {
  name: string
  enforce?: "pre" | "post"
  configResolved?: () => void
  configureServer?: (server: ViteDevServer) => void
  // 这里仅声明 generateBundle 关心的最小 this 结构，避免引入 vite 类型依赖
  generateBundle?: (this: { emitFile: (file: any) => void }) => void
}

export interface LogixSandboxKernelPluginOptions {
  /**
   * Kernel bundle 的 HTTP 挂载路径。
   * 默认：/sandbox/logix-core.js
   */
  readonly mountPath?: string
  /**
   * esbuild.wasm 的 HTTP 挂载路径。
   * 默认：/esbuild.wasm
   */
  readonly wasmPath?: string
}

/**
 * logixSandboxKernelPlugin
 *
 * 仅用于 Vite 项目：
 * - dev：从 @logix/sandbox 包内的 public 目录按需返回 logix-core.js / esbuild.wasm
 * - build：将这两个文件作为静态资源写入打包产物
 */
export function logixSandboxKernelPlugin(options: LogixSandboxKernelPluginOptions = {}): VitePlugin {
  const mountPath = options.mountPath ?? "/sandbox/logix-core.js"
  const wasmPath = options.wasmPath ?? "/esbuild.wasm"

  let kernelFile = ""
  let wasmFile = ""

  const resolveFiles = () => {
    if (kernelFile && wasmFile) {
      return
    }
    const thisDir = dirname(fileURLToPath(import.meta.url))
    kernelFile = resolve(thisDir, "../public/sandbox/logix-core.js")
    wasmFile = resolve(thisDir, "../public/esbuild.wasm")
  }

  return {
    name: "logix-sandbox-kernel",
    enforce: "pre",
    configResolved() {
      resolveFiles()
    },
    configureServer(server) {
      resolveFiles()

      server.middlewares.use((req, res, next) => {
        if (!req.url) {
          return next()
        }

        if (req.url === mountPath) {
          res.setHeader("Content-Type", "application/javascript")
          fs.createReadStream(kernelFile).pipe(res)
          return
        }

        if (req.url === wasmPath) {
          res.setHeader("Content-Type", "application/wasm")
          fs.createReadStream(wasmFile).pipe(res)
          return
        }

        next()
      })
    },
    generateBundle() {
      resolveFiles()

      const kernelFileName = mountPath.replace(/^\//, "")
      const wasmFileName = wasmPath.replace(/^\//, "")

      this.emitFile({
        type: "asset",
        fileName: kernelFileName,
        source: fs.readFileSync(kernelFile),
      })

      this.emitFile({
        type: "asset",
        fileName: wasmFileName,
        source: fs.readFileSync(wasmFile),
      })
    },
  }
}
