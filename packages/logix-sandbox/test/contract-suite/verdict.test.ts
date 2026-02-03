import { describe, it, expect } from 'vitest'

import { normalizeContractSuiteFacts } from '../../src/contract-suite/normalize.js'
import { computeContractSuiteVerdict } from '../../src/contract-suite/verdict.js'
import { PORT_SPEC_ARTIFACT_KEY, RULES_MANIFEST_ARTIFACT_KEY, TYPE_IR_ARTIFACT_KEY } from '../../src/contract-suite/normalize.js'

const makePortSpec = (moduleId: string) => ({
  protocolVersion: 'v1',
  moduleId,
  actions: [],
  events: [],
  outputs: [],
  exports: [],
})

const makeTypeIr = (moduleId: string) => ({
  protocolVersion: 'v1',
  moduleId,
  types: [],
})

describe('contract-suite (036): verdict', () => {
  it('PASS when trialrun ok and required artifacts present', () => {
    const facts = normalizeContractSuiteFacts({
      runId: 'r1',
      trialRunReport: {
        runId: 'r1',
        ok: true,
        artifacts: {
          [PORT_SPEC_ARTIFACT_KEY]: { artifactKey: PORT_SPEC_ARTIFACT_KEY, ok: true, value: makePortSpec('M') },
          [TYPE_IR_ARTIFACT_KEY]: { artifactKey: TYPE_IR_ARTIFACT_KEY, ok: true, value: makeTypeIr('M') },
          [RULES_MANIFEST_ARTIFACT_KEY]: { artifactKey: RULES_MANIFEST_ARTIFACT_KEY, ok: true, value: { manifest: {} } },
        },
      },
    })

    const verdict = computeContractSuiteVerdict(facts)
    expect(verdict.verdict).toBe('PASS')
    expect(verdict.summary?.breaking).toBe(0)
    expect(verdict.summary?.risky).toBe(0)
  })

  it('FAIL when PortSpec is missing', () => {
    const facts = normalizeContractSuiteFacts({
      runId: 'r1',
      trialRunReport: {
        runId: 'r1',
        ok: true,
        artifacts: {
          [RULES_MANIFEST_ARTIFACT_KEY]: { artifactKey: RULES_MANIFEST_ARTIFACT_KEY, ok: true, value: { manifest: {} } },
        },
      },
    })

    const verdict = computeContractSuiteVerdict(facts)
    expect(verdict.verdict).toBe('FAIL')
    expect(verdict.reasons.some((r) => r.code === 'artifact::portspec_unavailable')).toBe(true)
  })

  it('WARN when TypeIR is missing (default downgrade)', () => {
    const facts = normalizeContractSuiteFacts({
      runId: 'r1',
      trialRunReport: {
        runId: 'r1',
        ok: true,
        artifacts: {
          [PORT_SPEC_ARTIFACT_KEY]: { artifactKey: PORT_SPEC_ARTIFACT_KEY, ok: true, value: makePortSpec('M') },
          [RULES_MANIFEST_ARTIFACT_KEY]: { artifactKey: RULES_MANIFEST_ARTIFACT_KEY, ok: true, value: { manifest: {} } },
        },
      },
    })

    const verdict = computeContractSuiteVerdict(facts)
    expect(verdict.verdict).toBe('WARN')
    expect(verdict.reasons.some((r) => r.code === 'artifact::typeir_unavailable')).toBe(true)
  })

  it('WARN when trialrun missing dependency (and artifacts still available)', () => {
    const facts = normalizeContractSuiteFacts({
      runId: 'r1',
      trialRunReport: {
        runId: 'r1',
        ok: false,
        error: { code: 'MissingDependency', message: 'missing service' },
        artifacts: {
          [PORT_SPEC_ARTIFACT_KEY]: { artifactKey: PORT_SPEC_ARTIFACT_KEY, ok: true, value: makePortSpec('M') },
          [TYPE_IR_ARTIFACT_KEY]: { artifactKey: TYPE_IR_ARTIFACT_KEY, ok: true, value: makeTypeIr('M') },
          [RULES_MANIFEST_ARTIFACT_KEY]: { artifactKey: RULES_MANIFEST_ARTIFACT_KEY, ok: true, value: { manifest: {} } },
        },
      },
    })

    const verdict = computeContractSuiteVerdict(facts)
    expect(verdict.verdict).toBe('WARN')
    expect(verdict.reasons.some((r) => r.code === 'trialrun::missing_dependency')).toBe(true)
  })

  it('FAIL on reference space breaking changes', () => {
    const facts = normalizeContractSuiteFacts({
      runId: 'r1',
      trialRunReport: {
        runId: 'r1',
        ok: true,
        artifacts: {
          [PORT_SPEC_ARTIFACT_KEY]: {
            artifactKey: PORT_SPEC_ARTIFACT_KEY,
            ok: true,
            value: {
              protocolVersion: 'v1',
              moduleId: 'M',
              actions: [],
              events: [],
              outputs: [],
              exports: [],
            },
          },
          [TYPE_IR_ARTIFACT_KEY]: { artifactKey: TYPE_IR_ARTIFACT_KEY, ok: true, value: makeTypeIr('M') },
          [RULES_MANIFEST_ARTIFACT_KEY]: { artifactKey: RULES_MANIFEST_ARTIFACT_KEY, ok: true, value: { manifest: {} } },
        },
      },
      before: {
        portSpec: {
          protocolVersion: 'v1',
          moduleId: 'M',
          actions: [{ key: 'removed' }],
          events: [],
          outputs: [],
          exports: [],
        },
      },
    })

    const verdict = computeContractSuiteVerdict(facts)
    expect(verdict.verdict).toBe('FAIL')
    expect(verdict.reasons.some((r) => r.code === 'portspec::removed_action')).toBe(true)
  })
})

