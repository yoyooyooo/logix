import { describe, expect, it } from '@effect/vitest'
import { readFileSync } from 'node:fs'

const readText = (url: URL): string => readFileSync(url, 'utf8')

const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const assertNoAsync = (source: string, label: string) => {
  const text = stripComments(source)

  expect(text, `${label}: must not use Effect.async`).not.toMatch(/\bEffect\.async\b/)
  expect(text, `${label}: must not use Effect.promise`).not.toMatch(/\bEffect\.promise\b/)
  expect(text, `${label}: must not use Effect.tryPromise`).not.toMatch(/\bEffect\.tryPromise\b/)

  expect(text, `${label}: must not use new Promise`).not.toMatch(/\bnew\s+Promise\b/)
  expect(text, `${label}: must not use Promise.*`).not.toMatch(/\bPromise\./)
  expect(text, `${label}: must not use async function`).not.toMatch(/\basync\s+function\b/)
}

describe('Module NoAsyncGuard', () => {
  it('Module unwrap/descriptor paths stay sync-only (no Promise/Effect.async/Effect.promise/Effect.tryPromise)', () => {
    assertNoAsync(readText(new URL('../../../src/Module.ts', import.meta.url)), 'Module.ts')

    assertNoAsync(
      readText(new URL('../../../src/internal/runtime/BoundApiRuntime.ts', import.meta.url)),
      'BoundApiRuntime.ts',
    )
  })
})
