import { definePlaygroundProject } from '@logixjs/playground/Project'
import { liveBridgePlaygroundFiles, liveBridgeSourcePaths } from './files'

export const logixReactLiveBridgePlaygroundProject = definePlaygroundProject({
  id: 'logix-react.live-bridge',
  files: liveBridgePlaygroundFiles,
  program: {
    entry: liveBridgeSourcePaths.program,
  },
  capabilities: {
    run: true,
    check: true,
    trialStartup: true,
  },
  fixtures: {
    liveBridge: {
      targetCoordinate: 'runtime:example-runtime/module:LiveBridgeFixture/instance:default',
      evidencePackageId: 'live-evidence:example-runtime',
      authorityClass: 'agent-live-runtime-bridge-dogfood',
    },
  },
})
