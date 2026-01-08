import { Config, Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const State = Schema.Struct({
  a: Schema.Number,
  derivedA: Schema.Number,
})

const Actions = {
  noop: Schema.Void,
}

const ImportedDef = Logix.Module.make('ReflectImported', {
  state: Schema.Struct({ value: Schema.Number }),
  actions: { noop: Schema.Void },
  reducers: { noop: (s: any) => s },
})

const builder = Effect.gen(function* () {
  const host = yield* Logix.InternalContracts.RuntimeHost.RuntimeHost
  const enable = yield* Config.boolean('ENABLE_EXPERIMENTAL_TRAIT').pipe(Config.withDefault(false))

  const traits = Logix.StateTrait.from(State)({
    derivedA: Logix.StateTrait.node({
      meta: {
        label: enable ? 'derivedA (exp)' : 'derivedA',
        description: enable ? 'experimental computed field' : 'stable computed field',
        docsUrl: 'https://example.invalid/derivedA',
        tags: enable ? ['experimental'] : ['stable'],
        annotations: {
          'x-phantom-source': enable ? 'on' : 'off',
        },
      },
      computed: Logix.StateTrait.computed({
        deps: ['a'],
        get: (a) => a + 1,
      }),
    }),
  })

  const ReflectStaticIrDef = Logix.Module.make('ReflectStaticIr', {
    state: State,
    actions: Actions,
    reducers: { noop: (s: any) => s },
    traits,
  })

  const importedModule = ImportedDef.implement({
    initial: { value: 0 },
    logics: [],
  })

  const imports = enable ? [importedModule.impl] : []

  const debug = Logix.Debug.getModuleTraits(ReflectStaticIrDef as any)
  const program = debug.program
  const ir = program ? Logix.StateTrait.exportStaticIr(program, ReflectStaticIrDef.id) : undefined

  const importedIds = imports
    .filter((x: any) => x && x._tag === 'ModuleImpl')
    .map((x: any) => String(x.module?.id ?? 'unknown'))

  return {
    moduleId: ReflectStaticIrDef.id,
    host: host.kind,
    imports: importedIds,
    staticIr: ir,
    resources: program?.graph.resources ?? [],
  }
})

const runOnce = (config: Record<string, any>) =>
  Logix.InternalContracts.BuildEnv.run(builder, {
    runtimeHostKind: 'node',
    config,
  })

const main = Effect.gen(function* () {
  const stable = yield* runOnce({ ENABLE_EXPERIMENTAL_TRAIT: false })
  const experimental = yield* runOnce({ ENABLE_EXPERIMENTAL_TRAIT: true })

  // eslint-disable-next-line no-console
  console.log('[Reflection] stable:', {
    moduleId: stable.moduleId,
    host: stable.host,
    imports: stable.imports,
    digest: stable.staticIr?.digest,
  })

  // eslint-disable-next-line no-console
  console.log('[Reflection] experimental:', {
    moduleId: experimental.moduleId,
    host: experimental.host,
    imports: experimental.imports,
    digest: experimental.staticIr?.digest,
  })
})

Effect.runPromise(main).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
