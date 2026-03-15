import { HttpApiBuilder } from 'effect/unstable/httpapi'
import { Effect } from 'effect'

import { EffectApi } from '../app/effect-api.js'
import { Specboard } from './specboard.service.js'

export const SpecboardLive = HttpApiBuilder.group(EffectApi, 'Specboard', Effect.fn(function* (handlers) {
    return handlers
      .handle('specList', () =>
        Effect.gen(function* () {
          const specboard = yield* Effect.service(Specboard)
          return yield* specboard.listSpecs
        }),
      )
      .handle('taskList', ({ params }) =>
        Effect.gen(function* () {
          const specboard = yield* Effect.service(Specboard)
          return yield* specboard.listTasks(params.specId)
        }),
      )
      .handle('taskToggle', ({ params, payload }) =>
        Effect.gen(function* () {
          const specboard = yield* Effect.service(Specboard)
          return yield* specboard.toggleTask({ specId: params.specId, line: payload.line, checked: payload.checked })
        }),
      )
      .handle('fileRead', ({ params }) =>
        Effect.gen(function* () {
          const specboard = yield* Effect.service(Specboard)
          return yield* specboard.readFile({ specId: params.specId, name: params.name })
        }),
      )
      .handle('fileWrite', ({ params, payload }) =>
        Effect.gen(function* () {
          const specboard = yield* Effect.service(Specboard)
          return yield* specboard.writeFile({ specId: params.specId, name: params.name, content: payload.content })
        }),
      )
  }))
