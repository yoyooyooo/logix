import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface HmrWitnessEntry {
  readonly name: string
  readonly eventCount: number
  readonly residualActiveCounts: ReadonlyArray<number>
  readonly verdict: 'PASS' | 'FAIL'
}

export interface HmrWitnessArtifact {
  readonly schemaVersion: 1
  readonly feature: '158-runtime-hmr-lifecycle'
  readonly generatedAt: string
  readonly command: string
  readonly environment: {
    readonly host: string
    readonly carrier: string
    readonly browserProject?: string
  }
  readonly witnesses: ReadonlyArray<HmrWitnessEntry>
  readonly perf: {
    readonly comparable: boolean
    readonly conclusion: string
  }
}

export const hmrWitnessArtifactPath = fileURLToPath(
  new URL('../../../../specs/158-runtime-hmr-lifecycle/perf/hmr-carrier-witness.json', import.meta.url),
)

export const makeHmrWitnessArtifact = (
  input: Omit<HmrWitnessArtifact, 'schemaVersion' | 'feature' | 'generatedAt'>,
): HmrWitnessArtifact => ({
  schemaVersion: 1,
  feature: '158-runtime-hmr-lifecycle',
  generatedAt: '2026-04-26T00:00:00.000Z',
  ...input,
})

export const writeHmrWitnessArtifact = (
  artifact: HmrWitnessArtifact,
  path: string = hmrWitnessArtifactPath,
): void => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
}
