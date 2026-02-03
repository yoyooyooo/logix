import { Context, Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

import { CounterModule } from '../../modules/counter'

class DemoServiceTag extends Context.Tag('PlatformViz.DemoService')<DemoServiceTag, { readonly n: number }>() {}

class OptionalServiceTag extends Context.Tag('PlatformViz.OptionalService')<
  OptionalServiceTag,
  { readonly ok: boolean }
>() {}

const DemoState = Schema.Struct({
  a: Schema.Number,
  derivedA: Schema.Number,
})

const DemoActions = {
  noop: Schema.Void,
}

const DemoSlots = {
  Primary: { required: true, kind: 'single' as const },
  Aspects: { kind: 'aspect' as const },
}

const DemoTraits = Logix.StateTrait.from(DemoState)({
  derivedA: Logix.StateTrait.computed({
    deps: ['a'],
    get: (a) => a + 1,
  }),
})

const DemoDef = Logix.Module.make('PlatformViz.DemoModule', {
  state: DemoState,
  actions: DemoActions,
  slots: DemoSlots,
  services: {
    Demo: DemoServiceTag,
    Optional: { tag: OptionalServiceTag, optional: true },
  },
  traits: DemoTraits,
  meta: {
    owner: 'platform-viz',
    purpose: 'fixture',
  },
  dev: {
    source: { file: 'examples/logix-react/src/demos/platform-viz/fixtures.ts', line: 1, column: 1 },
  },
})

const PrimaryLogic = DemoDef.logic(
  ($) => ({
    setup: Effect.gen(function* () {
      yield* $.use(DemoServiceTag)
      yield* $.use(OptionalServiceTag)
    }),
    run: Effect.void,
  }),
  { id: 'PrimaryLogic', slotName: 'Primary' },
)

const AspectA = DemoDef.logic(() => Effect.void, { id: 'AspectA', slotName: 'Aspects' })
const AspectB = DemoDef.logic(() => Effect.void, { id: 'AspectB', slotName: 'Aspects' })

export const PlatformVizDemoModule = DemoDef.implement({
  initial: { a: 0, derivedA: 1 },
  logics: [PrimaryLogic, AspectA, AspectB],
})

export type PlatformVizModuleItem = {
  readonly id: string
  readonly title: string
  readonly module: any
}

export const platformVizModules: ReadonlyArray<PlatformVizModuleItem> = [
  {
    id: 'demo',
    title: 'Demo: slots + services + traits（推荐）',
    module: PlatformVizDemoModule,
  },
  {
    id: 'counter',
    title: 'examples/modules/counter（最小模块）',
    module: CounterModule,
  },
]

export const getPlatformVizModule = (id: string): PlatformVizModuleItem => {
  const found = platformVizModules.find((m) => m.id === id)
  return found ?? platformVizModules[0]!
}

