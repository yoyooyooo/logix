// Shared env helpers (@logixjs/core/Env):
// - getNodeEnv: reads the caller environment from globalThis.process.env.NODE_ENV.
// - isDevEnv: treats NODE_ENV !== "production" as a dev environment.
// The implementation lives in internal/runtime/core/env.ts to avoid duplication across packages.

import * as Internal from './internal/runtime/core/env.js'

export const getNodeEnv = (): string | undefined => Internal.getNodeEnv()

export const isDevEnv = (): boolean => Internal.isDevEnv()
