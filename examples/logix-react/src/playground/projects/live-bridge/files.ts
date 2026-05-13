import { playgroundProjectSourcePaths } from '@logixjs/playground/Project'
import mainProgramSource from './sources/src/main.program.ts?raw'

export const liveBridgeSourcePaths = {
  program: playgroundProjectSourcePaths.mainProgram,
} as const

export const liveBridgePlaygroundFiles = {
  [liveBridgeSourcePaths.program]: {
    language: 'ts',
    content: mainProgramSource,
    editable: true,
  },
} as const
