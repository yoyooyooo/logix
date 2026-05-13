import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import { snapshotFilesToModuleSource } from './programWrapper.js'

export const createActionManifestWrapperSource = (snapshot: ProjectSnapshot): string => {
  if (!snapshot.programEntry) {
    throw new Error(`Project ${snapshot.projectId} has no Program entry`)
  }

  const moduleSource = snapshotFilesToModuleSource(snapshot)

  return [
    'import { Effect as __LogixPlaygroundEffect } from "effect"',
    'import * as __LogixPlaygroundReflection from "@logixjs/core/repo-internal/reflection-api"',
    'import * as __LogixPlaygroundLogix from "@logixjs/core"',
    '',
    moduleSource,
    '',
    'export default __LogixPlaygroundEffect.sync(() => {',
    '  void __LogixPlaygroundLogix',
    '  return __LogixPlaygroundReflection.extractMinimumProgramActionManifest(Program, {',
    `    programId: ${JSON.stringify(snapshot.projectId)},`,
    `    revision: ${snapshot.revision},`,
    '  })',
    '})',
    '',
  ].join('\n')
}
