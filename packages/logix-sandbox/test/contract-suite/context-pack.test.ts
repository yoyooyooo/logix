import { describe, it, expect } from 'vitest'

import { normalizeContractSuiteFacts } from '../../src/contract-suite/normalize.js'
import { computeContractSuiteVerdict } from '../../src/contract-suite/verdict.js'
import { makeContractSuiteContextPack } from '../../src/contract-suite/context-pack.js'
import { PORT_SPEC_ARTIFACT_KEY, RULES_MANIFEST_ARTIFACT_KEY, TYPE_IR_ARTIFACT_KEY } from '../../src/contract-suite/normalize.js'

describe('contract-suite (036): context pack', () => {
  it('hides uiKitRegistry by default', () => {
    const facts = normalizeContractSuiteFacts({
      runId: 'r1',
      inputs: {
        uiKitRegistry: { components: [{ componentKey: 'Button' }] },
        bindingSchemas: [{ kind: 'BindingSchema' }],
      },
      trialRunReport: {
        runId: 'r1',
        ok: true,
        artifacts: {
          [PORT_SPEC_ARTIFACT_KEY]: {
            artifactKey: PORT_SPEC_ARTIFACT_KEY,
            ok: true,
            value: { protocolVersion: 'v1', moduleId: 'M', actions: [], events: [], outputs: [], exports: [] },
          },
          [TYPE_IR_ARTIFACT_KEY]: { artifactKey: TYPE_IR_ARTIFACT_KEY, ok: true, value: { protocolVersion: 'v1', moduleId: 'M', types: [] } },
          [RULES_MANIFEST_ARTIFACT_KEY]: { artifactKey: RULES_MANIFEST_ARTIFACT_KEY, ok: true, value: { manifest: {} } },
        },
      },
    })

    const verdict = computeContractSuiteVerdict(facts)
    const pack = makeContractSuiteContextPack({ facts, verdict })

    expect((pack.facts as any).inputs?.bindingSchemas).toBeTruthy()
    expect((pack.facts as any).inputs?.uiKitRegistry).toBeUndefined()
  })

  it('includes uiKitRegistry when enabled', () => {
    const facts = normalizeContractSuiteFacts({
      runId: 'r1',
      inputs: {
        uiKitRegistry: { components: [{ componentKey: 'Button' }] },
      },
      trialRunReport: { runId: 'r1', ok: true },
    })

    const pack = makeContractSuiteContextPack({
      facts,
      options: { includeUiKitRegistry: true },
    })

    expect((pack.facts as any).inputs?.uiKitRegistry).toEqual({ components: [{ componentKey: 'Button' }] })
  })

  it('applies maxBytes budget by deterministically dropping optional fields', () => {
    const facts = normalizeContractSuiteFacts({
      runId: 'r1',
      inputs: {
        uiKitRegistry: { components: Array.from({ length: 50 }, (_, i) => ({ componentKey: `C${i}` })) },
      },
      trialRunReport: {
        runId: 'r1',
        ok: false,
        error: { code: 'MissingDependency', message: 'missing' },
      },
    })

    const verdict = computeContractSuiteVerdict(facts)
    const pack = makeContractSuiteContextPack({
      facts,
      verdict,
      options: {
        includeUiKitRegistry: true,
        maxBytes: 400,
      },
    })

    expect((pack.notes as any).__logix?.truncated).toBe(true)
    expect((pack.facts.trialRunReport as any).runId).toBe('r1')
    expect(typeof (pack.facts.trialRunReport as any).ok).toBe('boolean')
  })
})

