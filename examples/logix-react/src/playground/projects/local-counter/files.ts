import { playgroundProjectSourcePaths } from '@logixjs/playground/Project'
import mainProgramSource from './sources/src/main.program.ts?raw'
import localCounterLogicSource from './sources/src/logic/localCounter.logic.ts?raw'

export const localCounterSourcePaths = {
  logic: playgroundProjectSourcePaths.logic('localCounter'),
  program: playgroundProjectSourcePaths.mainProgram,
} as const

export const localCounterPlaygroundFiles = {
  [localCounterSourcePaths.logic]: {
    language: 'ts',
    content: localCounterLogicSource,
    editable: true,
  },
  [localCounterSourcePaths.program]: {
    language: 'ts',
    content: mainProgramSource,
    editable: true,
  },
} as const
