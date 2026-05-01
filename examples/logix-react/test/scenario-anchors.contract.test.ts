import { describe, expect, it } from 'vitest'

import { scenarioAnchors } from '../src/scenarioAnchors'

describe('examples/logix-react scenario anchors', () => {
  it('should keep the standardized host scenario matrix stable', () => {
    expect(scenarioAnchors).toHaveLength(7)

    expect(scenarioAnchors.map((item) => item.scenario)).toEqual([
      'global singleton',
      'local instance',
      'host imports scope',
      'host root resolve',
      'host env override',
      'session instance',
      'suspend variant',
    ])

    expect(scenarioAnchors).toEqual([
      {
        scenario: 'global singleton',
        route: '/global-runtime',
        example: 'examples/logix-react/src/demos/GlobalRuntimeLayout.tsx',
        verification: 'examples/logix/src/verification/index.ts',
        role: 'example',
      },
      {
        scenario: 'local instance',
        route: '/local-program',
        example: 'examples/logix-react/src/demos/LocalModuleLayout.tsx',
        verification: null,
        role: 'example',
      },
      {
        scenario: 'host imports scope',
        route: '/host-root-imports',
        example: 'examples/logix-react/src/demos/DiShowcaseLayout.tsx',
        verification: null,
        role: 'example',
      },
      {
        scenario: 'host root resolve',
        route: '/host-root-imports',
        example: 'examples/logix-react/src/demos/DiShowcaseLayout.tsx',
        verification: null,
        role: 'example',
      },
      {
        scenario: 'host env override',
        route: '/host-env-override',
        example: 'examples/logix-react/src/demos/LayerOverrideDemoLayout.tsx',
        verification: null,
        role: 'projection',
      },
      {
        scenario: 'session instance',
        route: '/session-program',
        example: 'examples/logix-react/src/demos/SessionModuleLayout.tsx',
        verification: null,
        role: 'example',
      },
      {
        scenario: 'suspend variant',
        route: '/suspense-program',
        example: 'examples/logix-react/src/demos/SuspenseModuleLayout.tsx',
        verification: null,
        role: 'example',
      },
    ])
  })
})
