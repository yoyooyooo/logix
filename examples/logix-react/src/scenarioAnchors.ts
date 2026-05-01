export interface ScenarioAnchor {
  readonly scenario: string
  readonly route: string
  readonly example: string
  readonly verification: string | null
  readonly role: 'example' | 'projection'
}

export const scenarioAnchors: ReadonlyArray<ScenarioAnchor> = [
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
] as const
