import { definePlaygroundRegistry } from '@logixjs/playground/Project'
import { logixReactCheckImportsDiagnosticsProject } from './projects/diagnostics/check-imports'
import { logixReactPayloadValidatorUnavailableDiagnosticsProject } from './projects/diagnostics/payload-validator-unavailable'
import { logixReactReflectionActionGapDiagnosticsProject } from './projects/diagnostics/reflection-action-gap'
import { logixReactRunFailureDiagnosticsProject } from './projects/diagnostics/run-failure'
import { logixReactRunNullValueDiagnosticsProject } from './projects/diagnostics/run-null-value'
import { logixReactRunUndefinedValueDiagnosticsProject } from './projects/diagnostics/run-undefined-value'
import { logixReactTrialMissingConfigDiagnosticsProject } from './projects/diagnostics/trial-missing-config'
import { logixReactTrialMissingImportDiagnosticsProject } from './projects/diagnostics/trial-missing-import'
import { logixReactTrialMissingServiceDiagnosticsProject } from './projects/diagnostics/trial-missing-service'
import { logixReactLocalCounterPlaygroundProject } from './projects/local-counter'
import { logixReactNewProjectPlaygroundProject } from './projects/new-project'
import { logixReactActionDensePressureProject } from './projects/pressure/action-dense'
import { logixReactDiagnosticsDensePressureProject } from './projects/pressure/diagnostics-dense'
import { logixReactScenarioDriverPayloadPressureProject } from './projects/pressure/scenario-driver-payload'
import { logixReactStateLargePressureProject } from './projects/pressure/state-large'
import { logixReactTraceHeavyPressureProject } from './projects/pressure/trace-heavy'
import { logixReactServiceSourcePlaygroundProject } from './projects/service-source'

export const logixReactDefaultPlaygroundProjectId = logixReactNewProjectPlaygroundProject.id

export const logixReactPlaygroundRegistry = definePlaygroundRegistry([
  logixReactNewProjectPlaygroundProject,
  logixReactLocalCounterPlaygroundProject,
  logixReactActionDensePressureProject,
  logixReactStateLargePressureProject,
  logixReactTraceHeavyPressureProject,
  logixReactDiagnosticsDensePressureProject,
  logixReactScenarioDriverPayloadPressureProject,
  logixReactCheckImportsDiagnosticsProject,
  logixReactTrialMissingConfigDiagnosticsProject,
  logixReactTrialMissingServiceDiagnosticsProject,
  logixReactTrialMissingImportDiagnosticsProject,
  logixReactRunNullValueDiagnosticsProject,
  logixReactRunUndefinedValueDiagnosticsProject,
  logixReactRunFailureDiagnosticsProject,
  logixReactPayloadValidatorUnavailableDiagnosticsProject,
  logixReactReflectionActionGapDiagnosticsProject,
  logixReactServiceSourcePlaygroundProject,
])

export const logixReactPlaygroundProjectIndex = {
  [logixReactNewProjectPlaygroundProject.id]: logixReactNewProjectPlaygroundProject,
  [logixReactLocalCounterPlaygroundProject.id]: logixReactLocalCounterPlaygroundProject,
  [logixReactActionDensePressureProject.id]: logixReactActionDensePressureProject,
  [logixReactStateLargePressureProject.id]: logixReactStateLargePressureProject,
  [logixReactTraceHeavyPressureProject.id]: logixReactTraceHeavyPressureProject,
  [logixReactDiagnosticsDensePressureProject.id]: logixReactDiagnosticsDensePressureProject,
  [logixReactScenarioDriverPayloadPressureProject.id]: logixReactScenarioDriverPayloadPressureProject,
  [logixReactCheckImportsDiagnosticsProject.id]: logixReactCheckImportsDiagnosticsProject,
  [logixReactTrialMissingConfigDiagnosticsProject.id]: logixReactTrialMissingConfigDiagnosticsProject,
  [logixReactTrialMissingServiceDiagnosticsProject.id]: logixReactTrialMissingServiceDiagnosticsProject,
  [logixReactTrialMissingImportDiagnosticsProject.id]: logixReactTrialMissingImportDiagnosticsProject,
  [logixReactRunNullValueDiagnosticsProject.id]: logixReactRunNullValueDiagnosticsProject,
  [logixReactRunUndefinedValueDiagnosticsProject.id]: logixReactRunUndefinedValueDiagnosticsProject,
  [logixReactRunFailureDiagnosticsProject.id]: logixReactRunFailureDiagnosticsProject,
  [logixReactPayloadValidatorUnavailableDiagnosticsProject.id]: logixReactPayloadValidatorUnavailableDiagnosticsProject,
  [logixReactReflectionActionGapDiagnosticsProject.id]: logixReactReflectionActionGapDiagnosticsProject,
  [logixReactServiceSourcePlaygroundProject.id]: logixReactServiceSourcePlaygroundProject,
} as const
