import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Config, Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const State = Schema.Struct({
  a: Schema.Number,
  derivedA: Schema.Number,
})

const Actions = {
  noop: Schema.Void,
}

const Imported = Logix.Module.make('ReflectImported', {
  state: Schema.Struct({ value: Schema.Number }),
  actions: { noop: Schema.Void },
  reducers: { noop: (s: any) => s },
})

const builder = Effect.gen(function* () {
  const host = yield* FieldContracts.RuntimeHost.RuntimeHost
  const enable = yield* Config.boolean('ENABLE_EXPERIMENTAL_TRAIT').pipe(Config.withDefault(false))

  const fieldDeclarations = FieldContracts.fieldFrom(State)({
    derivedA: FieldContracts.fieldNode({
      meta: {
        label: enable ? 'derivedA (exp)' : 'derivedA',
        description: enable ? 'experimental computed field' : 'stable computed field',
        docsUrl: 'https://example.invalid/derivedA',
        tags: enable ? ['experimental'] : ['stable'],
        annotations: {
          'x-phantom-source': enable ? 'on' : 'off',
        },
      },
      computed: FieldContracts.fieldComputed({
        deps: ['a'],
        get: (a) => a + 1,
      }),
    }),
  })

  const ReflectStaticIrModule = Logix.Module.make('ReflectStaticIr', {
    state: State,
    actions: Actions,
    reducers: { noop: (s: any) => s },
  })

  const importedProgram = Logix.Program.make(Imported, {
    initial: { value: 0 },
    logics: [],
  })

  const imports = enable ? [importedProgram] : []
  const fieldsLogic = ReflectStaticIrModule.logic('__reflect_static_ir:fields', ($) => {
    $.fields(fieldDeclarations as any)
    return Effect.void
  })
  const ReflectStaticIr = Logix.Program.make(ReflectStaticIrModule, {
    initial: { a: 0, derivedA: 0 },
    logics: [fieldsLogic],
    capabilities: { imports },
  })

  const debug = CoreDebug.getModuleFieldProgram(ReflectStaticIrModule as any)
  const program = debug.program
  const ir = program
    ? FieldContracts.exportFieldStaticIr({
        program,
        moduleId: ReflectStaticIr.id,
      })
    : undefined

  const importedIds = imports
    .map((x: any) => String(x?.id ?? x?.module?.id ?? 'unknown'))

  return {
    moduleId: ReflectStaticIr.id,
    host: host.kind,
    imports: importedIds,
    staticIr: ir,
    resources: program?.graph.resources ?? [],
  }
})

const runOnce = (config: Record<string, any>) =>
  FieldContracts.BuildEnv.run(builder, {
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
