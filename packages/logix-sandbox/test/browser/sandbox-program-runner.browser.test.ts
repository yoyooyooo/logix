import { expect, test } from 'vitest'
import {
  buildProgramRunWrapper,
  createDocsRunnerFixture,
  programExampleSource,
  runWrappedSource,
} from './support/docsRunnerFixture.js'

const hasWorker = typeof Worker !== 'undefined'
const testFn = hasWorker ? test : test.skip

testFn('docs Program Run returns JSON-safe projection with stable supplied runId', async () => {
  const { client } = await createDocsRunnerFixture()
  const runId = 'run:test:docs-program'

  const result = await runWrappedSource(
    client,
    buildProgramRunWrapper(programExampleSource, { runId }),
    'docs-program-run.ts',
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
})

testFn('docs Program Run keeps supplied runId stable across repeated runs', async () => {
  const { client } = await createDocsRunnerFixture()
  const runId = 'run:test:docs-program-stable'
  const source = buildProgramRunWrapper(programExampleSource, { runId })

  const first = await runWrappedSource(client, source, 'docs-program-run-stable.ts', runId)
  const second = await runWrappedSource(client, source, 'docs-program-run-stable.ts', runId)

  expect((first as any).runId).toBe(runId)
  expect((second as any).runId).toBe(runId)
  expect((first as any).result).toEqual((second as any).result)
  expect((first as any).ok).toBe(true)
  expect((second as any).ok).toBe(true)
})
