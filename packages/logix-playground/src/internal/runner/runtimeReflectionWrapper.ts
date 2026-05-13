import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import { snapshotFilesToModuleSource } from './programWrapper.js'
import { sourceRefsForSnapshot } from './runtimeEvidence.js'

export const createRuntimeReflectionWrapperSource = (snapshot: ProjectSnapshot): string => {
  if (!snapshot.programEntry) {
    throw new Error(`Project ${snapshot.projectId} has no Program entry`)
  }

  const moduleSource = snapshotFilesToModuleSource(snapshot)
  const sourceRefs = sourceRefsForSnapshot(snapshot)

  return [
    'import { Effect as __LogixPlaygroundEffect } from "effect"',
    'import * as __LogixPlaygroundReflection from "@logixjs/core/repo-internal/reflection-api"',
    'import * as __LogixPlaygroundLogix from "@logixjs/core"',
    '',
    moduleSource,
    '',
    'export default __LogixPlaygroundEffect.sync(() => {',
    '  void __LogixPlaygroundLogix',
    '  const reflectionManifest = __LogixPlaygroundReflection.extractRuntimeReflectionManifest(Program, {',
    `    programId: ${JSON.stringify(snapshot.projectId)},`,
    `    sourceRefs: ${JSON.stringify(sourceRefs)},`,
    '  })',
    '  const minimumActionManifest = __LogixPlaygroundReflection.extractMinimumProgramActionManifest(Program, {',
    `    programId: ${JSON.stringify(snapshot.projectId)},`,
    `    revision: ${snapshot.revision},`,
    '  })',
    '  return { reflectionManifest, minimumActionManifest }',
    '})',
    '',
  ].join('\n')
}
