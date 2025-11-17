import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'

import { EffectApi } from '../app/effect-api.js'
import { Specboard } from './specboard.service.js'

export const SpecboardLive = HttpApiBuilder.group(EffectApi, 'Specboard', (handlers) =>
  handlers
    .handle('specList', () =>
      Effect.gen(function* () {
        const specboard = yield* Specboard
        return yield* specboard.listSpecs
      }),
    )
    .handle('taskList', ({ path }) =>
      Effect.gen(function* () {
        const specboard = yield* Specboard
        return yield* specboard.listTasks(path.specId)
      }),
    )
    .handle('taskToggle', ({ path, payload }) =>
      Effect.gen(function* () {
        const specboard = yield* Specboard
        return yield* specboard.toggleTask({ specId: path.specId, line: payload.line, checked: payload.checked })
      }),
    )
    .handle('fileRead', ({ path }) =>
      Effect.gen(function* () {
        const specboard = yield* Specboard
        return yield* specboard.readFile({ specId: path.specId, name: path.name })
      }),
    )
    .handle('fileWrite', ({ path, payload }) =>
      Effect.gen(function* () {
        const specboard = yield* Specboard
        return yield* specboard.writeFile({ specId: path.specId, name: path.name, content: payload.content })
      }),
    ),
)

