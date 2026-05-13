import { logixReactPlaygroundProjectIndex } from './registry'

export type PlaygroundScenarioMappabilityClassification =
  | 'directly-representable'
  | 'provenance-only'
  | 'unsupported'

export type PlaygroundScenarioMappabilitySupport = 'direct' | 'provenance-only' | 'unsupported'

export interface PlaygroundScenarioMappabilityStep {
  readonly stepId: string
  readonly playgroundKind: 'driver' | 'wait' | 'settle' | 'observe' | 'expect'
  readonly verificationKind: 'dispatch' | 'await' | 'read' | 'call' | 'tick' | 'expect' | null
  readonly support: PlaygroundScenarioMappabilitySupport
}

export interface PlaygroundScenarioMappabilityRow {
  readonly projectId: string
  readonly scenarioId: string
  readonly corpusId: 'local-counter-increment-state-change'
  readonly classification: PlaygroundScenarioMappabilityClassification
  readonly authority: 'playground-mappability-only'
  readonly executable: false
  readonly programEntry: string
  readonly driverActionTags: ReadonlyArray<string>
  readonly readAnchorIds: ReadonlyArray<string>
  readonly stepIntents: ReadonlyArray<PlaygroundScenarioMappabilityStep>
  readonly unsupportedReasons: ReadonlyArray<string>
}

const localCounter = logixReactPlaygroundProjectIndex['logix-react.local-counter']

export const logixReactPlaygroundScenarioMappability: ReadonlyArray<PlaygroundScenarioMappabilityRow> = [
  {
    projectId: localCounter.id,
    scenarioId: 'counter-demo',
    corpusId: 'local-counter-increment-state-change',
    classification: 'directly-representable',
    authority: 'playground-mappability-only',
    executable: false,
    programEntry: localCounter.program?.entry ?? '/src/main.program.ts',
    driverActionTags: ['increment'],
    readAnchorIds: ['counter'],
    stepIntents: [
      { stepId: 'increase-once', playgroundKind: 'driver', verificationKind: 'dispatch', support: 'direct' },
      { stepId: 'settle-runtime', playgroundKind: 'settle', verificationKind: 'await', support: 'direct' },
      { stepId: 'expect-state', playgroundKind: 'expect', verificationKind: 'expect', support: 'direct' },
    ],
    unsupportedReasons: [],
  },
]
