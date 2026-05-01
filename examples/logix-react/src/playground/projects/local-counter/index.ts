import { definePlaygroundProject } from '@logixjs/playground/Project'
import { localCounterPlaygroundFiles, localCounterSourcePaths } from './files'
import { localCounterDrivers } from './drivers'
import { localCounterScenarios } from './scenarios'

export const logixReactLocalCounterPlaygroundProject = definePlaygroundProject({
  id: 'logix-react.local-counter',
  files: localCounterPlaygroundFiles,
  program: {
    entry: localCounterSourcePaths.program,
  },
  drivers: localCounterDrivers,
  scenarios: localCounterScenarios,
  capabilities: {
    run: true,
    check: true,
    trialStartup: true,
  },
  fixtures: {
    exampleRoute: '/local-program',
  },
})
