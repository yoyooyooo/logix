import { describe, expect, it } from 'vitest'
import { makeVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import {
  projectControlPlaneDiagnosticRows,
  summarizeControlPlaneDiagnosticRows,
} from '../src/internal/diagnostics/controlPlaneDiagnostics.js'

describe('control-plane diagnostics projection', () => {
  it('projects check findings and trial dependency causes without synthetic pressure rows', () => {
    const checkReport = makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'check',
      mode: 'static',
      verdict: 'FAIL',
      errorCode: 'PROGRAM_IMPORT_INVALID',
      summary: 'runtime.check found static assembly issues',
      environment: { runId: 'run:test:check', host: 'static' },
      artifacts: [{ outputKey: 'module-manifest', kind: 'ModuleManifest', digest: 'manifest:test' }],
      repairHints: [
        {
          code: 'PROGRAM_IMPORT_INVALID',
          canAutoRetry: false,
          upgradeToStage: 'check',
          focusRef: { declSliceId: 'Program.capabilities.imports[2]' },
          reason: 'Program.capabilities.imports only accepts Program entries.',
          suggestedAction: 'repair the Program declaration and rerun runtime.check',
        },
      ],
      findings: [
        {
          kind: 'import',
          code: 'PROGRAM_IMPORT_INVALID',
          ownerCoordinate: 'Program.capabilities.imports[2]',
          summary: 'Program.capabilities.imports only accepts Program entries.',
          focusRef: { declSliceId: 'Program.capabilities.imports[2]' },
        },
      ],
      nextRecommendedStage: 'check',
    })

    const trialReport = makeVerificationControlPlaneReport({
      kind: 'VerificationControlPlaneReport',
      stage: 'trial',
      mode: 'startup',
      verdict: 'FAIL',
      errorCode: 'MissingDependency',
      summary: 'Build-time missing config: provide the missing key(s) in buildEnv.config, or add a default value to Config.',
      environment: {
        runId: 'run:test:trial',
        missingConfigKeys: ['MISSING_CONFIG_KEY'],
        missingServices: [],
        tagIds: [],
        configKeys: ['MISSING_CONFIG_KEY'],
      },
      artifacts: [],
      repairHints: [
        {
          code: 'MissingDependency',
          canAutoRetry: false,
          upgradeToStage: 'trial',
          focusRef: { declSliceId: 'config:MISSING_CONFIG_KEY' },
          reason: 'config dependency missing at config:MISSING_CONFIG_KEY',
          suggestedAction: 'provide the missing dependency through the appropriate runtime capability and rerun runtime.trial',
        },
      ],
      dependencyCauses: [
        {
          kind: 'config',
          phase: 'startup-boot',
          ownerCoordinate: 'config:MISSING_CONFIG_KEY',
          providerSource: 'runtime-overlay',
          focusRef: { declSliceId: 'config:MISSING_CONFIG_KEY' },
          errorCode: 'MissingDependency',
        },
      ],
      findings: [
        {
          kind: 'dependency',
          code: 'MissingDependency',
          ownerCoordinate: 'config:MISSING_CONFIG_KEY',
          summary: 'config dependency missing during startup-boot',
          focusRef: { declSliceId: 'config:MISSING_CONFIG_KEY' },
        },
      ],
      nextRecommendedStage: 'trial',
    })

    const rows = projectControlPlaneDiagnosticRows({
      checkState: { status: 'passed', report: checkReport },
      trialStartupState: { status: 'passed', report: trialReport },
    })

    expect(rows.map((row) => row.code)).toEqual([
      'PROGRAM_IMPORT_INVALID',
      'MissingDependency',
    ])
    expect(rows.map((row) => row.authority)).toEqual([
      'runtime.check/static',
      'runtime.trial/startup',
    ])
    expect(rows.map((row) => row.evidence).join('\n')).toContain('Program.capabilities.imports[2]')
    expect(rows.map((row) => row.evidence).join('\n')).toContain('config:MISSING_CONFIG_KEY')
    expect(rows.map((row) => row.message).join('\n')).not.toContain('Pressure diagnostic')
    expect(rows.map((row) => row.evidence).join('\n')).not.toContain('pressure=')

    expect(summarizeControlPlaneDiagnosticRows(rows)).toEqual({
      errors: 2,
      warnings: 0,
      info: 0,
    })
  })
})
