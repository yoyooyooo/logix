import * as esbuild from "esbuild-wasm"

let initialized = false
let kernelPath = "/sandbox/logix-core.js"

const EFFECT_VERSION = "3.19.8"

const cdnResolvePlugin: esbuild.Plugin = {
  name: "cdn-resolve",
  setup(build) {
    build.onResolve({ filter: /^effect($|\/)/ }, (args) => {
      const subpath = args.path === "effect" ? "" : args.path.slice("effect/".length)
      const path = subpath ? `https://esm.sh/effect@${EFFECT_VERSION}/${subpath}` : `https://esm.sh/effect@${EFFECT_VERSION}`
      return { path, external: true }
    })

    build.onResolve({ filter: /^@logix\/core($|\/)/ }, () => ({
      path: kernelPath,
      external: true,
    }))

    build.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.path.startsWith("effect") || args.path.startsWith("@logix/core")) {
        return null
      }
      return { path: `https://esm.sh/${args.path}`, external: true }
    })
  },
}

export type CompileResult = { success: true; bundle: string } | { success: false; errors: string[] }

export async function initCompiler(wasmUrl: string): Promise<void> {
  if (initialized) return
  await esbuild.initialize({
    wasmURL: wasmUrl,
    worker: false,
  })
  initialized = true
}

export async function compile(code: string, filename = "input.tsx"): Promise<CompileResult> {
  if (!initialized) {
    return { success: false, errors: ["编译器未初始化，请先调用 initCompiler()"] }
  }

  try {
    const result = await esbuild.build({
      stdin: {
        contents: code,
        loader: "tsx",
        resolveDir: "/",
        sourcefile: filename,
      },
      bundle: true,
      format: "esm",
      write: false,
      plugins: [cdnResolvePlugin],
      target: "es2020",
      minify: false,
      sourcemap: "inline",
    })

    if (result.errors.length > 0) {
      return { success: false, errors: result.errors.map((e) => e.text) }
    }

    const bundle = result.outputFiles?.[0]?.text ?? ""
    return { success: true, bundle }
  } catch (error) {
    return { success: false, errors: [error instanceof Error ? error.message : String(error)] }
  }
}

export function isInitialized(): boolean {
  return initialized
}

export function setKernelPath(path: string): void {
  kernelPath = path
}
