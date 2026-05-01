import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readManifest = (): { readonly specifiers?: ReadonlyArray<string> } =>
  JSON.parse(readFileSync(new URL('../public/sandbox/logix-core.manifest.json', import.meta.url), 'utf8'))

describe('sandbox kernel manifest', () => {
  it('keeps repo-internal reflection available to Playground runtime wrappers', () => {
    const manifest = readManifest()

    expect(manifest.specifiers).toContain('repo-internal/reflection-api')
    expect(existsSync(new URL('../public/sandbox/logix-core/repo-internal.reflection-api.js', import.meta.url))).toBe(
      true,
    )
  })
})
