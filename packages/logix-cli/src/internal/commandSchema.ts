export type CliCommandSchema = {
  readonly schemaVersion: 1
  readonly kind: 'LogixCliCommandSchema'
  readonly authority: ReadonlyArray<string>
  readonly derivedMirror: true
  readonly commands: ReadonlyArray<{
    readonly name: 'check' | 'trial' | 'compare'
    readonly runtimeStage: 'check' | 'trial' | 'compare'
    readonly requiredInputs: ReadonlyArray<string>
    readonly optionalInputs: ReadonlyArray<string>
    readonly forbiddenInputs: ReadonlyArray<string>
    readonly primaryReportOutputKey: string
  }>
  readonly commandResult: {
    readonly requiredFields: ReadonlyArray<string>
    readonly primaryReportArtifactKind: 'VerificationControlPlaneReport'
    readonly inputCoordinateFields: ReadonlyArray<string>
    readonly artifactFields: ReadonlyArray<string>
  }
  readonly exitCodes: ReadonlyArray<{
    readonly code: 0 | 1 | 2
    readonly meaning: string
  }>
}

export const CLI_COMMAND_SCHEMA: CliCommandSchema = {
  schemaVersion: 1,
  kind: 'LogixCliCommandSchema',
  derivedMirror: true,
  authority: [
    'docs/ssot/runtime/15-cli-agent-first-control-plane.md',
    'docs/ssot/runtime/09-verification-control-plane.md',
    '@logixjs/core/ControlPlane',
  ],
  commands: [
    {
      name: 'check',
      runtimeStage: 'check',
      requiredInputs: ['runId', 'entry'],
      optionalInputs: ['evidence', 'selection', 'out', 'outRoot', 'budgetBytes', 'host', 'tsconfig'],
      forbiddenInputs: ['scenario', 'beforeReport', 'afterReport', 'beforeEvidence', 'afterEvidence'],
      primaryReportOutputKey: 'checkReport',
    },
    {
      name: 'trial',
      runtimeStage: 'trial',
      requiredInputs: ['runId', 'entry'],
      optionalInputs: [
        'mode',
        'evidence',
        'selection',
        'out',
        'outRoot',
        'budgetBytes',
        'host',
        'tsconfig',
        'diagnosticsLevel',
        'maxEvents',
        'timeout',
        'includeTrace',
        'config',
      ],
      forbiddenInputs: ['scenario', 'beforeReport', 'afterReport', 'beforeEvidence', 'afterEvidence'],
      primaryReportOutputKey: 'trialReport',
    },
    {
      name: 'compare',
      runtimeStage: 'compare',
      requiredInputs: ['runId', 'beforeReport', 'afterReport'],
      optionalInputs: ['beforeEvidence', 'afterEvidence', 'entry', 'out', 'outRoot', 'budgetBytes', 'host', 'tsconfig'],
      forbiddenInputs: ['scenario', 'evidence', 'selection'],
      primaryReportOutputKey: 'compareReport',
    },
  ],
  commandResult: {
    requiredFields: [
      'schemaVersion',
      'kind',
      'runId',
      'command',
      'ok',
      'inputCoordinate',
      'artifacts',
      'primaryReportOutputKey',
    ],
    primaryReportArtifactKind: 'VerificationControlPlaneReport',
    inputCoordinateFields: [
      'command',
      'argvSnapshot',
      'entry',
      'evidence',
      'selection',
      'trialMode',
      'scenario',
      'beforeReport',
      'afterReport',
      'beforeEvidence',
      'afterEvidence',
    ],
    artifactFields: [
      'outputKey',
      'kind',
      'schemaVersion',
      'ok',
      'file',
      'inline',
      'truncated',
      'budgetBytes',
      'actualBytes',
      'digest',
      'reasonCodes',
      'error',
    ],
  },
  exitCodes: [
    { code: 0, meaning: 'command completed and the primary control-plane report passed' },
    { code: 1, meaning: 'command completed with a control-plane failure or runtime failure' },
    { code: 2, meaning: 'command input, command name, or CLI invocation is invalid' },
  ],
}
