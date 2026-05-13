export type VerificationScenarioStepKind = 'dispatch' | 'await' | 'read' | 'call' | 'tick'
export type VerificationScenarioExpectationKind = 'equals' | 'includes' | 'exists' | 'count' | 'changed'

export interface VerificationScenarioCorpusEntry {
  readonly id: string
  readonly docs: string
  readonly authority: 'verification-corpus'
  readonly fixtures: {
    readonly env: string
  }
  readonly steps: ReadonlyArray<{
    readonly id: string
    readonly kind: VerificationScenarioStepKind
    readonly target: string
    readonly note: string
  }>
  readonly expect: ReadonlyArray<{
    readonly id: string
    readonly kind: VerificationScenarioExpectationKind
    readonly target: 'state' | 'evidence summary' | 'artifacts' | 'environment'
    readonly note: string
  }>
}

export const verificationScenarioCorpus = [
  {
    id: 'local-counter-increment-state-change',
    docs: 'docs/ssot/runtime/09-verification-control-plane.md',
    authority: 'verification-corpus',
    fixtures: {
      env: 'Program entry with local counter state and declared increment action',
    },
    steps: [
      {
        id: 'dispatch-increment',
        kind: 'dispatch',
        target: 'action:increment',
        note: 'dispatch the declared increment action through a controlled scenario plan',
      },
      {
        id: 'await-settle',
        kind: 'await',
        target: 'runtime-settle',
        note: 'wait for the runtime to settle before reading state',
      },
      {
        id: 'read-counter-state',
        kind: 'read',
        target: 'state:counter',
        note: 'read the counter state through the scenario read coordinate',
      },
    ],
    expect: [
      {
        id: 'counter-state-changed',
        kind: 'changed',
        target: 'state',
        note: 'counter state changed after increment',
      },
    ],
  },
] as const satisfies ReadonlyArray<VerificationScenarioCorpusEntry>

export type VerificationScenarioCorpusId = (typeof verificationScenarioCorpus)[number]['id']

export const verificationScenarioCorpusIds = verificationScenarioCorpus.map((entry) => entry.id)
