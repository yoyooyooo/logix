import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { fieldValue, fieldValues, rawFormMeta, useImportedModule, useModule, useSelector } from '../src/index.js'

const Counter = Logix.Module.make('CanonicalHooksCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {},
})

const Pair = Logix.Module.make('CanonicalHooksPair', {
  state: Schema.Struct({ count: Schema.Number, label: Schema.String }),
  actions: {},
})

const Page = Logix.Module.make('CanonicalHooksPage', {
  state: Schema.Struct({ ready: Schema.Boolean }),
  actions: {},
})

const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
})
const CounterBlueprint = RuntimeContracts.getProgramRuntimeBlueprint(CounterProgram)

const PageProgram = Logix.Program.make(Page, {
  initial: { ready: true },
  capabilities: {
    imports: [CounterProgram],
  },
})

const singleton = useModule(Counter.tag)
const pair = useModule(Pair.tag)
const page = useModule(PageProgram, { key: 'page:42' })
const localCounter = useImportedModule(page, Counter.tag)
const tagged = Object.assign(page, { marker: 'keep-me' as const })
const same = useModule(tagged)

const marker: 'keep-me' = same.marker
const readyByQuery: boolean = useSelector(page, fieldValue('ready'))
const rawMeta = useSelector(
  useModule(
    Logix.Program.make(
      Logix.Module.make('CanonicalHooksFormLike', {
        state: Schema.Struct({
          $form: Schema.Struct({
            submitCount: Schema.Number,
            isSubmitting: Schema.Boolean,
            isDirty: Schema.Boolean,
            errorCount: Schema.Number,
          }),
        }),
        actions: {},
      }),
      {
        initial: {
          $form: {
            submitCount: 0,
            isSubmitting: false,
            isDirty: false,
            errorCount: 0,
          },
        },
      },
    ),
  ),
  rawFormMeta(),
)
const rawErrorCount: number = rawMeta.errorCount

// @ts-expect-error public no-arg host read is removed by specs/169
useSelector(page)

const countValue = useSelector(singleton, fieldValue('count'))
countValue satisfies number

const countTuple = useSelector(singleton, fieldValues(['count']))
countTuple satisfies readonly [number]

const pairTuple = useSelector(pair, fieldValues(['count', 'label']))
pairTuple satisfies readonly [number, string]

// @ts-expect-error fieldValues rejects invalid later literal paths
useSelector(pair, fieldValues(['count', 'missing']))

// @ts-expect-error fieldValues rejects invalid literal paths
useSelector(singleton, fieldValues(['missing']))

// @ts-expect-error typed handles reject widened fieldValues paths because they cannot be checked against state.
useSelector(singleton, fieldValues(['count'] as readonly string[]))

// @ts-expect-error legacy module-object input is removed from the day-one route
useModule(Counter)

// @ts-expect-error removed from public root surface
import { useLocalModule } from '../src/index.js'

// @ts-expect-error removed from public root surface
import { useLayerModule } from '../src/index.js'

// @ts-expect-error removed from public root surface
import { ModuleScope } from '../src/index.js'

// @ts-expect-error ProgramRuntimeBlueprint no longer belongs to public useModule contract
useModule(CounterBlueprint)

declare const runtime: Logix.ModuleRuntime<{ count: number }, any>
useSelector(runtime, (s) => s.count)

// @ts-expect-error selector route moved to useSelector(handle, selector)
useModule(tagged, (s) => s.ready)

// @ts-expect-error constructor + selector route moved to useSelector(useModule(...), selector)
useModule(Counter.tag, (s) => s.count)

void singleton
void pair
void page
void localCounter
void marker
void readyByQuery
void rawErrorCount
