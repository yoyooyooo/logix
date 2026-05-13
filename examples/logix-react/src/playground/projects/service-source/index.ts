import { definePlaygroundProject } from '@logixjs/playground/Project'
import { serviceSourcePlaygroundFiles, serviceSourcePaths } from './files'
import { serviceSourceFileGroups } from './service-files'

export const logixReactServiceSourcePlaygroundProject = definePlaygroundProject({
  id: 'logix-react.service-source',
  files: serviceSourcePlaygroundFiles,
  program: {
    entry: serviceSourcePaths.program,
  },
  serviceFiles: serviceSourceFileGroups,
  capabilities: {
    run: true,
    check: true,
    trialStartup: true,
  },
})
