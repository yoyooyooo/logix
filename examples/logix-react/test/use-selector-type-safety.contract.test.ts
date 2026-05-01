import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const demosRoot = path.resolve(import.meta.dirname, '../src/demos')

const walkTsxFiles = (root: string): Array<string> => {
  const out: Array<string> = []
  for (const entry of readdirSync(root)) {
    const next = path.join(root, entry)
    const stat = statSync(next)
    if (stat.isDirectory()) {
      out.push(...walkTsxFiles(next))
      continue
    }
    if (next.endsWith('.tsx')) out.push(next)
  }
  return out.sort()
}

const selectorEscapePatterns: ReadonlyArray<RegExp> = [
  /useSelector\([^,\n]+\)/g,
  /useSelector\([\s\S]*?\(\s*s\s*:\s*any\s*\)\s*=>/g,
  /useSelector\([\s\S]*?\)\s+as\s+[A-Za-z_{]/g,
  /useSelector\([\s\S]*?\(\s*s\s*\)\s*=>\s*s\s+as\s+/g,
]

describe('examples/logix-react demos · useSelector type safety contract', () => {
  it('keeps demo selectors free of any-based and as-based escape hatches', () => {
    for (const file of walkTsxFiles(demosRoot)) {
      const source = readFileSync(file, 'utf8')
      for (const pattern of selectorEscapePatterns) {
        expect(source, `${path.relative(path.resolve(import.meta.dirname, '..'), file)} :: ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})
