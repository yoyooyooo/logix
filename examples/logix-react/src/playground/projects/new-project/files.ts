import { playgroundProjectSourcePaths } from '@logixjs/playground/Project'
import mainProgramSource from './sources/src/main.program.ts?raw'

export const newProjectSourcePaths = {
  program: playgroundProjectSourcePaths.mainProgram,
} as const

export const newProjectPlaygroundFiles = {
  [newProjectSourcePaths.program]: {
    language: 'ts',
    content: mainProgramSource,
    editable: true,
  },
} as const
