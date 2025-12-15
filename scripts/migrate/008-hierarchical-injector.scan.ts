import fg from "fast-glob"
import { readFile } from "node:fs/promises"
import path from "node:path"

type Position = {
  readonly line: number
  readonly column: number
}

type Hit = {
  readonly kind: "useRemote" | "missing-imports"
  readonly file: string
  readonly pos: Position
  readonly detail: string
}

const toPos = (source: string, index: number): Position => {
  const upTo = source.slice(0, index)
  const lines = upTo.split("\n")
  const line = lines.length
  const column = lines[lines.length - 1]!.length + 1
  return { line, column }
}

const extractImportsBlocks = (source: string): ReadonlyArray<string> => {
  const blocks: string[] = []
  const re = /imports\s*:\s*\[/g

  for (const m of source.matchAll(re)) {
    const start = m.index + m[0].lastIndexOf("[")
    let depth = 0
    let end = start
    for (let i = start; i < source.length; i += 1) {
      const ch = source[i]
      if (ch === "[") depth += 1
      if (ch === "]") depth -= 1
      if (depth === 0) {
        end = i + 1
        break
      }
    }
    if (end > start) {
      blocks.push(source.slice(start, end))
    }
  }

  return blocks
}

const scanFile = async (absPath: string): Promise<ReadonlyArray<Hit>> => {
  const source = await readFile(absPath, "utf8")
  const rel = path.relative(process.cwd(), absPath)

  const hits: Hit[] = []

  // 1) $.useRemote(...)
  {
    const re = /\$\s*\.\s*useRemote\s*\(/g
    for (const m of source.matchAll(re)) {
      hits.push({
        kind: "useRemote",
        file: rel,
        pos: toPos(source, m.index),
        detail: "$.useRemote(...)",
      })
    }
  }

  // 2) $.use(X.module) 但同文件 imports 未出现 X.impl / X.implement（best-effort）
  {
    const importsBlocks = extractImportsBlocks(source)
    if (importsBlocks.length > 0) {
      const re = /\$\s*\.\s*use\s*\(\s*([A-Za-z0-9_$]+(?:\.[A-Za-z0-9_$]+)*)/g
      for (const m of source.matchAll(re)) {
        const token = m[1]
        if (!token.endsWith(".module")) continue
        const base = token.slice(0, -".module".length)

        const hasInImports = importsBlocks.some((block) => {
          if (block.includes(`${base}.impl`)) return true
          if (block.includes(`${base}.implement`)) return true
          return false
        })

        if (!hasInImports) {
          hits.push({
            kind: "missing-imports",
            file: rel,
            pos: toPos(source, m.index),
            detail:
              `Found $.use(${token}) but could not find ` +
              `${base}.impl / ${base}.implement inside the same-file imports: [...] (best-effort scan).`,
          })
        }
      }
    }
  }

  return hits
}

const main = async () => {
  const files = await fg(
    [
      "packages/**/*.{ts,tsx,js,jsx}",
      "apps/**/*.{ts,tsx,js,jsx}",
      "examples/**/*.{ts,tsx,js,jsx}",
    ],
    {
      absolute: true,
      ignore: [
        "**/node_modules/**",
        "**/.git/**",
        "**/.turbo/**",
        "**/dist/**",
        "**/build/**",
        "**/coverage/**",
        "**/public/**",
        "**/*.d.ts",
      ],
    },
  )

  const allHits = (
    await Promise.all(files.map((file) => scanFile(file)))
  ).flat()

  const useRemoteHits = allHits.filter((h) => h.kind === "useRemote")
  const missingImportsHits = allHits.filter((h) => h.kind === "missing-imports")

  const print = (h: Hit) =>
    console.log(
      `- ${h.kind} ${h.file}:${h.pos.line}:${h.pos.column} ${h.detail}`,
    )

  console.log("[008-hierarchical-injector.scan] Summary")
  console.log(`- $.useRemote(...) occurrences: ${useRemoteHits.length}`)
  console.log(`- Suspicious $.use(X.module) missing same-file imports: ${missingImportsHits.length}`)
  console.log("")

  if (useRemoteHits.length > 0) {
    console.log("[useRemote]")
    useRemoteHits.forEach(print)
    console.log("")
  }

  if (missingImportsHits.length > 0) {
    console.log("[missing-imports] (best-effort; false positives possible)")
    missingImportsHits.forEach(print)
    console.log("")
  }

  if (useRemoteHits.length === 0 && missingImportsHits.length === 0) {
    console.log("No findings.")
  }
}

void main()

