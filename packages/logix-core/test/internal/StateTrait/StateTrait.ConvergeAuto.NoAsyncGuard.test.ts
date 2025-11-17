import { describe, expect, it } from '@effect/vitest'
import { existsSync, readFileSync } from 'node:fs'

const readText = (url: URL): string => readFileSync(url, 'utf8')

const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const assertNoAsync = (source: string, label: string) => {
  const text = stripComments(source)

  expect(text, `${label}: must not use Effect.async`).not.toMatch(/\bEffect\.async\b/)
  expect(text, `${label}: must not use Effect.promise`).not.toMatch(/\bEffect\.promise\b/)
  expect(text, `${label}: must not use Effect.tryPromise`).not.toMatch(/\bEffect\.tryPromise\b/)

  // Promise: allow type-level "PromiseLike" etc elsewhere, but forbid common runtime constructs.
  expect(text, `${label}: must not use new Promise`).not.toMatch(/\bnew\s+Promise\b/)
  expect(text, `${label}: must not use Promise.*`).not.toMatch(/\bPromise\./)
  expect(text, `${label}: must not use async function`).not.toMatch(/\basync\s+function\b/)
}

describe('StateTrait converge auto NoAsyncGuard', () => {
  it('auto decision path stays sync-only (no Promise/Effect.async/Effect.promise/Effect.tryPromise)', () => {
    assertNoAsync(readText(new URL('../../../src/internal/state-trait/converge.ts', import.meta.url)), 'converge.ts')

    // Future-proof: once plan-cache.ts exists, keep it sync-only as well.
    const planCacheUrl = new URL('../../../src/internal/state-trait/plan-cache.ts', import.meta.url)
    if (existsSync(planCacheUrl)) {
      assertNoAsync(readText(planCacheUrl), 'plan-cache.ts')
    }
  })
})
