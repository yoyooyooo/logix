import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const reflectionDir = resolve(fileURLToPath(new URL('../../src/internal/reflection', import.meta.url)))

const listTsFiles = (dir: string): ReadonlyArray<string> => {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const next = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...listTsFiles(next))
      continue
    }
    if (entry.isFile() && extname(entry.name) === '.ts') {
      files.push(next)
    }
  }

  return files.sort()
}

describe('Kernel reflection internal edges', () => {
  it('should not import deleted root observability shells from internal reflection helpers', () => {
    const offenders = listTsFiles(reflectionDir).filter((file) => {
      const source = readFileSync(file, 'utf8')
      return source.includes('../../Observability') || source.includes('../Observability')
    })

    expect(offenders).toEqual([])
  })
})
