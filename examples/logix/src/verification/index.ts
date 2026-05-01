export const verificationExamples = [
  {
    id: 'trial-run-evidence',
    docs: 'docs/ssot/runtime/09-verification-control-plane.md',
    example: 'examples/logix/src/scenarios/trial-run-evidence.ts',
    fixtures: {
      env: 'runtime.trial(mode="startup") with example runtime layer',
    },
    steps: ['load scenario', 'run trial', 'collect standard report'],
    expect: ['verdict=PASS', 'artifacts include trial report'],
  },
  {
    id: 'field-kernel-direct-api',
    docs: 'docs/ssot/runtime/06-form-field-kernel-boundary.md',
    example: 'examples/logix/src/scenarios/ir/reflectStaticIr.ts',
    fixtures: {
      env: 'field-kernel direct API sample with static IR export',
    },
    steps: ['load field-kernel scenario', 'inspect fixtures/env', 'compare exported artifacts'],
    expect: ['artifacts include static IR', 'report remains machine-readable'],
  },
] as const
