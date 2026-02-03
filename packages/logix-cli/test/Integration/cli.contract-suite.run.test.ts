import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const readJson = async (filePath: string): Promise<unknown> => JSON.parse(await fs.readFile(filePath, 'utf8'))

describe('logix-cli integration (036): contract-suite run', () => {
  it('should PASS for a basic module by default', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-contract-suite-'))
    const entry = path.resolve(__dirname, '../fixtures/BasicModule.ts#AppRoot')

    const res = await Effect.runPromise(
      runCli([
        'contract-suite',
        'run',
        '--runId',
        'r1',
        '--entry',
        entry,
        '--out',
        tmp,
        '--diagnosticsLevel',
        'off',
        '--timeout',
        '2000',
      ]),
    )

    expect(res.kind).toBe('result')
    if (res.kind !== 'result') throw new Error('expected result')
    expect(res.exitCode).toBe(0)
    expect(res.result.ok).toBe(true)

    const verdict = await readJson(path.join(tmp, 'contract-suite.verdict.json'))
    expect((verdict as any)?.protocolVersion).toBe('v1')
    expect((verdict as any)?.verdict).toBe('PASS')

    const trialRunReport = await readJson(path.join(tmp, 'trialrun.report.json'))
    const schemaRegistryEnv = (trialRunReport as any)?.artifacts?.['@logixjs/schema.registry@v1']
    expect(schemaRegistryEnv?.ok).toBe(true)

    await expect(fs.stat(path.join(tmp, 'contract-suite.context-pack.json'))).rejects.toBeTruthy()
  })

  it('should include PatchPlan/AutofillReport in context pack when --includeAnchorAutofill is set', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-contract-suite-'))
    const root = path.resolve(__dirname, '..', '..', '..', '..')
    const repoRoot = path.join(root, 'examples/logix-cli-playground')
    const entry = path.join(repoRoot, 'src/entry.basic.ts#AppRoot')

    const res = await Effect.runPromise(
      runCli([
        'contract-suite',
        'run',
        '--runId',
        'r1',
        '--entry',
        entry,
        '--out',
        tmp,
        '--includeAnchorAutofill',
        '--repoRoot',
        repoRoot,
        '--diagnosticsLevel',
        'off',
        '--timeout',
        '2000',
      ]),
    )

    expect(res.kind).toBe('result')
    if (res.kind !== 'result') throw new Error('expected result')
    expect(res.exitCode).toBe(0)

    const pack = await readJson(path.join(tmp, 'contract-suite.context-pack.json'))
    const artifacts = Array.isArray((pack as any)?.facts?.artifacts) ? ((pack as any).facts.artifacts as any[]) : []

    const patchPlan = artifacts.find((a) => a?.artifactKey === '@logixjs/anchor.patchPlan@v1')
    expect(patchPlan?.status).toBe('PRESENT')
    expect(patchPlan?.value?.kind).toBe('PatchPlan')

    const autofillReport = artifacts.find((a) => a?.artifactKey === '@logixjs/anchor.autofillReport@v1')
    expect(autofillReport?.status).toBe('PRESENT')
    expect(autofillReport?.value?.kind).toBe('AutofillReport')
  })

  it('should VIOLATION when --requireRulesManifest is set and RulesManifest is missing', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-contract-suite-'))
    const entry = path.resolve(__dirname, '../fixtures/BasicModule.ts#AppRoot')

    const res = await Effect.runPromise(
      runCli([
        'contract-suite',
        'run',
        '--runId',
        'r1',
        '--entry',
        entry,
        '--out',
        tmp,
        '--requireRulesManifest',
        '--diagnosticsLevel',
        'off',
        '--timeout',
        '2000',
      ]),
    )

    expect(res.kind).toBe('result')
    if (res.kind !== 'result') throw new Error('expected result')
    expect(res.exitCode).toBe(2)
    expect(res.result.ok).toBe(false)

    const verdict = await readJson(path.join(tmp, 'contract-suite.verdict.json'))
    expect((verdict as any)?.verdict).toBe('FAIL')

    const pack = await readJson(path.join(tmp, 'contract-suite.context-pack.json'))
    const artifacts = Array.isArray((pack as any)?.facts?.artifacts) ? ((pack as any).facts.artifacts as any[]) : []
    const schemaRegistry = artifacts.find((a) => a?.artifactKey === '@logixjs/schema.registry@v1')
    expect(schemaRegistry).toBeDefined()
    expect(schemaRegistry?.status).toBe('PRESENT')
    expect(schemaRegistry?.value?.protocolVersion).toBe('v1')
  })

  it('should include facts.inputs via --inputs and redact uiKitRegistry by default', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-contract-suite-'))
    const entry = path.resolve(__dirname, '../fixtures/BasicModule.ts#AppRoot')

    const inputsFile = path.join(tmp, 'inputs.json')
    await fs.writeFile(
      inputsFile,
      JSON.stringify(
        {
          stageBlueprint: { protocolVersion: 'v1', stageId: 's1', modules: [], rules: [] },
          uiKitRegistry: { protocolVersion: 'v1', kitId: 'k1', components: [] },
        },
        null,
        2,
      ),
      'utf8',
    )

    const res = await Effect.runPromise(
      runCli([
        'contract-suite',
        'run',
        '--runId',
        'r1',
        '--entry',
        entry,
        '--out',
        tmp,
        '--inputs',
        inputsFile,
        '--includeContextPack',
        '--diagnosticsLevel',
        'off',
        '--timeout',
        '2000',
      ]),
    )

    expect(res.kind).toBe('result')
    if (res.kind !== 'result') throw new Error('expected result')
    expect(res.exitCode).toBe(0)
    expect(res.result.ok).toBe(true)

    const pack = await readJson(path.join(tmp, 'contract-suite.context-pack.json'))
    expect((pack as any)?.facts?.inputs?.stageBlueprint?.stageId).toBe('s1')
    expect((pack as any)?.facts?.inputs?.uiKitRegistry).toBeUndefined()
  })

  it('should include uiKitRegistry in pack when --includeUiKitRegistry is set', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-contract-suite-'))
    const entry = path.resolve(__dirname, '../fixtures/BasicModule.ts#AppRoot')

    const inputsFile = path.join(tmp, 'inputs.json')
    await fs.writeFile(
      inputsFile,
      JSON.stringify(
        {
          stageBlueprint: { protocolVersion: 'v1', stageId: 's1', modules: [], rules: [] },
          uiKitRegistry: { protocolVersion: 'v1', kitId: 'k1', components: [] },
        },
        null,
        2,
      ),
      'utf8',
    )

    const res = await Effect.runPromise(
      runCli([
        'contract-suite',
        'run',
        '--runId',
        'r1',
        '--entry',
        entry,
        '--out',
        tmp,
        '--inputs',
        inputsFile,
        '--includeContextPack',
        '--includeUiKitRegistry',
        '--diagnosticsLevel',
        'off',
        '--timeout',
        '2000',
      ]),
    )

    expect(res.kind).toBe('result')
    if (res.kind !== 'result') throw new Error('expected result')
    expect(res.exitCode).toBe(0)
    expect(res.result.ok).toBe(true)

    const pack = await readJson(path.join(tmp, 'contract-suite.context-pack.json'))
    expect((pack as any)?.facts?.inputs?.stageBlueprint?.stageId).toBe('s1')
    expect((pack as any)?.facts?.inputs?.uiKitRegistry?.kitId).toBe('k1')
  })
})
