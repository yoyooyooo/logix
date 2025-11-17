export type { ExecutionResult, TraceEvent } from './internal/api/ExecutionResult.js'
export {
  expectActionSequence,
  expectActionTag,
  expectNoActionTag,
  expectNoError,
  getActionsByTag,
  getErrors,
  hasAction,
  hasError,
  make,
} from './internal/api/ExecutionResult.js'
