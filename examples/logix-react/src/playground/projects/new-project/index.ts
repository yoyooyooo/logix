import { definePlaygroundProject } from '@logixjs/playground/Project'
import { newProjectPlaygroundFiles, newProjectSourcePaths } from './files'

export const logixReactNewProjectPlaygroundProject = definePlaygroundProject({
  id: 'logix-react.new-project',
  files: newProjectPlaygroundFiles,
  program: {
    entry: newProjectSourcePaths.program,
  },
  capabilities: {
    run: true,
    check: true,
    trialStartup: true,
  },
})
