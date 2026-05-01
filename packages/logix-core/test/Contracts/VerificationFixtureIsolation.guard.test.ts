import { describe, expect, it } from '@effect/vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const verificationSrcRoot = resolve(fileURLToPath(new URL('../../src/internal/verification', import.meta.url)))

const forbiddenLegacyVerificationFixtureModules = [
  'scenarioReasonLinkProbe.ts',
  'scenarioWitnessAdapter.ts',
  'scenarioExpectationProbe.ts',
  'comparePerfAdmissibilityProbe.ts',
] as const

const forbiddenLegacyVerificationFixtureNeedles = [
  'scenarioReasonLinkProbe',
  'scenarioWitnessAdapter',
  'scenarioExpectationProbe',
  'comparePerfAdmissibilityProbe',
] as const

const collectTsFiles = (root: string): ReadonlyArray<string> => {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }
      if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath)
      }
    }
  }
  walk(root)
  return files.sort()
}

describe('Verification fixture isolation guard', () => {
  it('keeps fixture-only verification helpers out of production internals', () => {
    const leftoverModules = forbiddenLegacyVerificationFixtureModules.filter((fileName) =>
      existsSync(resolve(verificationSrcRoot, fileName)),
    )
    expect(leftoverModules).toEqual([])

    const offenders = collectTsFiles(verificationSrcRoot)
      .map((filePath) => ({
        filePath,
        source: readFileSync(filePath, 'utf8'),
      }))
      .flatMap(({ filePath, source }) =>
        forbiddenLegacyVerificationFixtureNeedles
          .filter((needle) => source.includes(needle))
          .map((needle) => ({ filePath, needle })),
      )

    expect(offenders).toEqual([])
  })
})
