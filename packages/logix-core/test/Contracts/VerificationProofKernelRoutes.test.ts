import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const trialRunPath = resolve(fileURLToPath(new URL('../../src/internal/verification/trialRun.ts', import.meta.url)))
const trialRunModulePath = resolve(
  fileURLToPath(new URL('../../src/internal/observability/trialRunModule.ts', import.meta.url)),
)
const kernelContractPath = resolve(
  fileURLToPath(new URL('../../src/internal/reflection/kernelContract.ts', import.meta.url)),
)
const fullCutoverGatePath = resolve(
  fileURLToPath(new URL('../../src/internal/reflection/fullCutoverGate.ts', import.meta.url)),
)

describe('Verification proof-kernel routes', () => {
  it('keeps trialRun as a thin wrapper around proofKernel', () => {
    const source = readFileSync(trialRunPath, 'utf8')

    expect(source.includes('./proofKernel')).toBe(true)
    expect(source.includes('makeRunSession(')).toBe(false)
    expect(source.includes('makeEvidenceCollector(')).toBe(false)
  })

  it('routes canonical Runtime.trial through proofKernel', () => {
    const source = readFileSync(trialRunModulePath, 'utf8')

    expect(source.includes('../verification/proofKernel')).toBe(true)
    expect(source.includes('makeRunSession(')).toBe(false)
    expect(source.includes('makeEvidenceCollector(')).toBe(false)
    expect(source.includes('./trialRunEnvironment')).toBe(true)
    expect(source.includes('./trialRunErrors')).toBe(true)
    expect(source.includes('const parseMissingDependencyFromCause')).toBe(false)
    expect(source.includes('const buildEnvironmentIr')).toBe(false)
    expect(source.includes('const toErrorSummaryWithCode')).toBe(false)
  })

  it('routes Reflection.verifyKernelContract through proofKernel', () => {
    const source = readFileSync(kernelContractPath, 'utf8')

    expect(source.includes('../verification/proofKernel')).toBe(true)
    expect(source.includes("from '../verification/trialRun'")).toBe(false)
  })

  it('routes Reflection.verifyFullCutoverGate through proofKernel', () => {
    const source = readFileSync(fullCutoverGatePath, 'utf8')

    expect(source.includes('../verification/proofKernel')).toBe(true)
    expect(source.includes("from '../verification/trialRun'")).toBe(false)
  })
})
