import fs from "node:fs"
import path from "node:path"
import type { Plugin } from "vite"

const stripQuery = (id: string): string => id.split("?", 1)[0]!

/**
 * Vite/Vitest 在显式写了 `.js` 扩展名时不会自动回退解析到 `.ts/.tsx` 源文件。
 * 本仓库的 TS 源码采用 Node ESM 友好写法（相对导入写 `.js`），所以需要一个 resolver 兜底。
 */
export const jsToTsResolver = (): Plugin => ({
  name: "intent-flow:js-to-ts-resolver",
  enforce: "pre",
  resolveId(source, importer) {
    if (!importer) {
      return null
    }
    if (!source.startsWith(".")) {
      return null
    }
    if (!source.endsWith(".js")) {
      return null
    }

    const importerPath = stripQuery(importer)
    const sourcePath = stripQuery(source)

    const resolvedJs = path.resolve(path.dirname(importerPath), sourcePath)
    if (fs.existsSync(resolvedJs)) {
      return null
    }

    const base = resolvedJs.slice(0, -".js".length)
    const candidates = [`${base}.ts`, `${base}.tsx`, `${base}.mts`, `${base}.cts`]

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        return filePath
      }
    }

    return null
  },
})

