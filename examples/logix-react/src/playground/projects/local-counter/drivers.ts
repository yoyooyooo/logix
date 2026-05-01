import type { PlaygroundDriver } from '@logixjs/playground/Project'

export const localCounterDrivers: ReadonlyArray<PlaygroundDriver> = [
  {
    id: 'increase',
    label: 'Increase',
    description: 'Dispatch the reflected increment action through the current Program session.',
    operation: 'dispatch',
    actionTag: 'increment',
    payload: { kind: 'void' },
    readAnchors: [{ id: 'counter', label: 'Counter', target: 'state' }],
  },
]
