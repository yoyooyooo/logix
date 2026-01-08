// Public EffectOp API (@logixjs/core/EffectOp).
// Note: implementation lives in `src/internal/effect-op.ts` to avoid internal importing root submodules.

import * as Internal from './internal/effect-op.js'

export type EffectOp<Out = unknown, Err = unknown, Env = unknown> = Internal.EffectOp<Out, Err, Env>

export type OperationPolicy = Internal.OperationPolicy

export type OperationRejected = Internal.OperationRejected

export type OperationError<E> = Internal.OperationError<E>

export type Middleware = Internal.Middleware

export type MiddlewareStack = Internal.MiddlewareStack

export const composeMiddleware = Internal.composeMiddleware

export const makeOperationRejected = Internal.makeOperationRejected

export const make = Internal.make

export const makeInRunSession = Internal.makeInRunSession

export const withMeta = Internal.withMeta

export const run = Internal.run
