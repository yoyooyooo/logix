import { expect, test } from 'vitest'
import {
  buildProgramRunWrapper,
  createDocsRunnerFixture,
  programExampleSource,
  runWrappedSource,
} from './support/docsRunnerFixture.js'

const hasWorker = typeof Worker !== 'undefined'
const testFn = hasWorker ? test : test.skip

testFn('docs Program Run projection is bounded and distinct from control-plane reports', async () => {
  const { client } = await createDocsRunnerFixture()
  const runId = 'run:test:docs-program-projection-contract'

  const result = await runWrappedSource(
    client,
    buildProgramRunWrapper(programExampleSource, { runId }),
    'docs-program-projection-contract.ts',
    runId,
  )

  expect(result).toMatchObject({
    runId,
    ok: true,
    result: { count: 2 },
  })
  expect(typeof (result as any).durationMs).toBe('number')
  expect('stage' in (result as any)).toBe(false)
  expect('mode' in (result as any)).toBe(false)
  expect('verdict' in (result as any)).toBe(false)
  expect('repairHints' in (result as any)).toBe(false)
  expect('nextRecommendedStage' in (result as any)).toBe(false)
})
