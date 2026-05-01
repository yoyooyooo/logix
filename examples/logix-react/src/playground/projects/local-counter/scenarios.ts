import type { PlaygroundScenario } from '@logixjs/playground/Project'

export const localCounterScenarios: ReadonlyArray<PlaygroundScenario> = [
  {
    id: 'counter-demo',
    label: 'Counter demo',
    description: 'Run the curated increment driver and verify state is observable.',
    steps: [
      { id: 'increase-once', kind: 'driver', driverId: 'increase' },
      { id: 'settle-runtime', kind: 'settle', timeoutMs: 1000 },
      { id: 'expect-state', kind: 'expect', target: 'state', assertion: 'changed' },
    ],
  },
]
