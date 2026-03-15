import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('ExternalStore runtime boundary', () => {
  it('does not call Effect.runSync/runFork directly in public sugar layer', () => {
    const file = path.resolve(import.meta.dirname, '../../../src/ExternalStore.ts')
    const text = fs.readFileSync(file, 'utf8')

    expect(text).not.toMatch(/\bEffect\.runSync\s*\(/)
    expect(text).not.toMatch(/\bEffect\.runFork\s*\(/)
  })
})
