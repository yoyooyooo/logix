import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import { snapshotFilesToModuleSource } from './programWrapper.js'

export interface ProgramSessionWrapperInput {
  readonly snapshot: ProjectSnapshot
  readonly actions: ReadonlyArray<{ readonly _tag: string; readonly payload?: unknown }>
  readonly sessionId: string
  readonly operationSeq: number
}

const serializeActionsForWrapper = (
  actions: ReadonlyArray<{ readonly _tag: string; readonly payload?: unknown }>,
): string => {
  const encoded = actions.map((action) => ({
    _tag: action._tag,
    payload: action.payload === undefined
      ? { __logixPlaygroundUndefined: true }
      : action.payload,
  }))

  return JSON.stringify(encoded)
}

export const createProgramSessionWrapperSource = (input: ProgramSessionWrapperInput): string => {
  if (!input.snapshot.programEntry) {
    throw new Error(`Project ${input.snapshot.projectId} has no Program entry`)
  }

  const moduleSource = snapshotFilesToModuleSource(input.snapshot)

  return [
    'import { Effect as __LogixPlaygroundEffect } from "effect"',
    'import * as __LogixPlaygroundLogix from "@logixjs/core"',
    '',
    moduleSource,
    '',
    `const __logixPlaygroundEncodedActions = ${serializeActionsForWrapper(input.actions)}`,
    'const __logixPlaygroundActions = __logixPlaygroundEncodedActions.map((action) => ({',
    '  _tag: action._tag,',
    '  payload: action.payload && action.payload.__logixPlaygroundUndefined === true ? undefined : action.payload,',
    '}))',
    '',
    'export default __LogixPlaygroundEffect.scoped(__LogixPlaygroundEffect.gen(function* () {',
    `  const ctx = yield* __LogixPlaygroundLogix.Runtime.openProgram(Program, { runId: ${JSON.stringify(input.sessionId)}, handleSignals: false })`,
    '  for (const action of __logixPlaygroundActions) {',
    '    yield* ctx.module.dispatch(action)',
    '  }',
    '  const __logixPlaygroundCurrentAction = __logixPlaygroundActions[__logixPlaygroundActions.length - 1]',
    '  const state = yield* ctx.module.getState',
    '  return {',
    '    state,',
    '    logs: __logixPlaygroundCurrentAction',
    `      ? [{ level: "info", message: \`dispatch \${__logixPlaygroundCurrentAction._tag}\`, source: "runner", sessionId: ${JSON.stringify(input.sessionId)}, operationSeq: ${input.operationSeq} }]`,
    '      : [],',
    '  }',
    '}))',
    '',
  ].join('\n')
}
