import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const contractsDir = resolve(fileURLToPath(new URL('.', import.meta.url)))
const sourceDir = resolve(fileURLToPath(new URL('../../src', import.meta.url)))
const selfPath = fileURLToPath(import.meta.url)
const expectedExpertConsumers = [
  'Contracts.045.KernelContractVerification.test.ts',
  'Contracts.047.FullCutoverGate.serializable.test.ts',
  'VerificationControlPlaneContract.test.ts',
] as const
const nonConsumerAuditFiles = new Set(['KernelReflectionExpertConsumers.test.ts', 'VerificationProofKernelRoutes.test.ts'])

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

describe('Kernel reflection expert consumers', () => {
  it('should treat route-audit contract files as non-consumer helpers', () => {
    expect(Array.from(nonConsumerAuditFiles).sort()).toEqual([
      'KernelReflectionExpertConsumers.test.ts',
      'VerificationProofKernelRoutes.test.ts',
    ])
  })

  it('should keep Reflection.verify* references limited to intentional expert-only contract tests', () => {
    const hits = listTsFiles(contractsDir)
      .filter((file) => file !== selfPath)
      .filter((file) => !nonConsumerAuditFiles.has(basename(file)))
      .filter((file) => {
        const source = readFileSync(file, 'utf8')
        return source.includes('Reflection.verifyKernelContract') || source.includes('Reflection.verifyFullCutoverGate')
      })
      .map((file) => file.slice(contractsDir.length + 1))
      .sort()

    expect(hits).toEqual(expectedExpertConsumers)
  })

  it('should not expose legacy Observability trial helpers in source or contract tests', () => {
    const offenders: string[] = []

    for (const file of [...listTsFiles(sourceDir), ...listTsFiles(contractsDir)]) {
      if (file === selfPath) continue

      const source = readFileSync(file, 'utf8')
      if (
        source.includes('Observability.trialRun') ||
        source.includes('Observability.trialRunModule') ||
        source.includes('trialRun:') ||
        source.includes('trialRunModule:')
      ) {
        offenders.push(file)
      }
    }

    expect(offenders).toEqual([])
  })
})
