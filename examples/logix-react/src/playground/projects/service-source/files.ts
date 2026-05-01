import { playgroundProjectSourcePaths } from '@logixjs/playground/Project'
import mainProgramSource from './sources/src/main.program.ts?raw'
import searchServiceSource from './sources/src/services/search.service.ts?raw'

export const serviceSourcePaths = {
  program: playgroundProjectSourcePaths.mainProgram,
  searchService: playgroundProjectSourcePaths.service('search'),
} as const

export const serviceSourcePlaygroundFiles = {
  [serviceSourcePaths.program]: {
    language: 'ts',
    content: mainProgramSource,
    editable: true,
  },
  [serviceSourcePaths.searchService]: {
    language: 'ts',
    content: searchServiceSource,
    editable: true,
  },
} as const
