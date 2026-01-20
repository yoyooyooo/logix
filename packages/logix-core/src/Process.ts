import { Effect, FiberRef } from 'effect'
import * as ModuleFactory from './internal/runtime/ModuleFactory.js'
import * as Debug from './internal/runtime/core/DebugSink.js'
import { currentConvergeStaticIrCollectors } from './internal/runtime/core/ConvergeStaticIrCollector.js'
import { exportDeclarativeLinkIr, type DeclarativeLinkIR } from './internal/runtime/core/DeclarativeLinkIR.js'
import { DeclarativeLinkRuntimeTag } from './internal/runtime/core/env.js'
import type * as Protocol from './internal/runtime/core/process/protocol.js'
import * as Meta from './internal/runtime/core/process/meta.js'
import type { AnyModuleShape, ModuleHandle, ModuleLike, ModuleTag } from './internal/module.js'
import * as ReadQuery from './ReadQuery.js'

export type DiagnosticsLevel = Protocol.DiagnosticsLevel
export type ProcessScope = Protocol.ProcessScope
export type ProcessIdentity = Protocol.ProcessIdentity
export type ProcessInstanceIdentity = Protocol.ProcessInstanceIdentity
export type ProcessTriggerSpec = Protocol.ProcessTriggerSpec
export type ProcessTrigger = Protocol.ProcessTrigger
export type ProcessConcurrencyPolicy = Protocol.ProcessConcurrencyPolicy
export type ProcessErrorPolicy = Protocol.ProcessErrorPolicy
export type ProcessDefinition = Protocol.ProcessDefinition
export type ProcessInstallation = Protocol.ProcessInstallation
export type SerializableErrorSummary = Protocol.SerializableErrorSummary
export type ProcessInstanceStatus = Protocol.ProcessInstanceStatus
export type ProcessEvent = Protocol.ProcessEvent
export type ProcessControlRequest = Protocol.ProcessControlRequest
export type ProcessPlatformEvent = Protocol.ProcessPlatformEvent

export type ProcessEffect<E = never, R = never> = Meta.ProcessEffect<E, R>

export type ProcessMakeDefinition =
  | string
  | {
      readonly processId: string
      readonly name?: string
      readonly description?: string
      readonly requires?: ReadonlyArray<string>
      readonly triggers?: ReadonlyArray<ProcessTriggerSpec>
      readonly concurrency?: ProcessConcurrencyPolicy
      readonly errorPolicy?: ProcessErrorPolicy
      readonly diagnosticsLevel?: DiagnosticsLevel
    }

const DEFAULT_TRIGGERS: ReadonlyArray<ProcessTriggerSpec> = [{ kind: 'platformEvent', platformEvent: 'runtime:boot' }]

const normalizeDefinition = (input: ProcessMakeDefinition): ProcessDefinition => {
  const base = typeof input === 'string' ? ({ processId: input } satisfies { readonly processId: string }) : input

  const processId = base.processId
  if (typeof processId !== 'string' || processId.length === 0) {
    throw new Error('[Process.make] processId must be a non-empty string')
  }

  const triggers = Array.isArray(base.triggers) && base.triggers.length > 0 ? base.triggers : DEFAULT_TRIGGERS

  const concurrency = base.concurrency ?? ({ mode: 'latest' } satisfies ProcessConcurrencyPolicy)
  const errorPolicy = base.errorPolicy ?? ({ mode: 'failStop' } satisfies ProcessErrorPolicy)
  const diagnosticsLevel = base.diagnosticsLevel ?? 'off'

  return {
    processId,
    name: base.name,
    description: base.description,
    requires: base.requires,
    triggers,
    concurrency,
    errorPolicy,
    diagnosticsLevel,
  }
}

export const make = <E, R>(definition: ProcessMakeDefinition, effect: Effect.Effect<void, E, R>): ProcessEffect<E, R> =>
  Meta.attachMeta(effect, {
    definition: normalizeDefinition(definition),
    kind: 'process',
  })

export const getDefinition = (effect: Effect.Effect<void, any, any>): ProcessDefinition | undefined =>
  Meta.getDefinition(effect)

export const getMeta = (effect: Effect.Effect<void, any, any>): Meta.ProcessMeta | undefined => Meta.getMeta(effect)

export const attachMeta = <E, R>(effect: Effect.Effect<void, E, R>, meta: Meta.ProcessMeta): ProcessEffect<E, R> =>
  Meta.attachMeta(effect, meta)

type LinkModuleToken<Id extends string, Sh extends AnyModuleShape> = ModuleTag<Id, Sh> | ModuleLike<Id, Sh, object>

type LinkModuleIdOf<M> = M extends { readonly id: infer Id } ? Id : never
type LinkModuleShapeOf<M> =
  M extends ModuleLike<string, infer Sh, object> ? Sh : M extends ModuleTag<string, infer Sh> ? Sh : never
type LinkModuleTagOf<M> =
  M extends ModuleLike<string, infer Sh, object>
    ? ModuleTag<string, Sh>
    : M extends ModuleTag<string, AnyModuleShape>
      ? M
      : never

const isModuleLike = (value: unknown): value is ModuleLike<string, AnyModuleShape, object> =>
  Boolean(value) &&
  typeof value === 'object' &&
  ((value as { readonly _kind?: unknown })._kind === 'ModuleDef' ||
    (value as { readonly _kind?: unknown })._kind === 'Module') &&
  'tag' in (value as object)

const unwrapModuleTag = <Id extends string, Sh extends AnyModuleShape>(
  module: LinkModuleToken<Id, Sh>,
): ModuleTag<Id, Sh> => {
  if (isModuleLike(module)) {
    return module.tag
  }
  return module as ModuleTag<Id, Sh>
}

export interface LinkConfig<Ms extends readonly LinkModuleToken<string, AnyModuleShape>[]> {
  readonly id?: string
  readonly modules: Ms
}

export type LinkHandles<Ms extends readonly LinkModuleToken<string, AnyModuleShape>[]> = {
  [M in Ms[number] as LinkModuleIdOf<M>]: ModuleHandle<LinkModuleShapeOf<M>>
}

type ModulesRecord<Ms extends readonly LinkModuleToken<string, AnyModuleShape>[]> = {
  [M in Ms[number] as LinkModuleIdOf<M>]: LinkModuleTagOf<M>
}

export function link<Ms extends readonly LinkModuleToken<string, AnyModuleShape>[], E = never, R = never>(
  config: LinkConfig<Ms>,
  logic: ($: LinkHandles<Ms>) => Effect.Effect<void, E, R>,
): ProcessEffect<E, R> {
  const linkId =
    config.id ??
    [...config.modules]
      .map((m) => m.id)
      .sort()
      .join('~')

  const modulesRecord = Object.create(null) as ModulesRecord<Ms>
  const requires = new Set<string>()

  for (const module of config.modules) {
    const tag = unwrapModuleTag(module)
    requires.add(String(tag.id))
    ;(modulesRecord as Record<string, ModuleTag<string, AnyModuleShape>>)[tag.id] = tag as unknown as ModuleTag<
      string,
      AnyModuleShape
    >
  }

  const effect = ModuleFactory.Link(
    modulesRecord as unknown as Record<string, ModuleTag<string, AnyModuleShape>>,
    logic as unknown as ($: Record<string, ModuleHandle<AnyModuleShape>>) => Effect.Effect<void, E, R>,
  )

  const wrapped = Effect.gen(function* () {
    const level = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
    if (level !== 'off') {
      yield* Debug.record({
        type: 'diagnostic',
        moduleId: `link:${linkId}`,
        code: 'process_link::blackbox_best_effort',
        severity: 'info',
        message:
          '[Process.link] Blackbox link is best-effort and is NOT stabilized within the same tick. Strong consistency applies only to declarative IR.',
        hint: 'If you need same-tick strong consistency, migrate to Process.linkDeclarative(...) (073).',
        kind: 'blackbox_link_boundary',
      })
    }
    return yield* effect
  }) as unknown as Effect.Effect<void, E, R>

  const definition: ProcessDefinition = {
    processId: linkId,
    requires: Array.from(requires),
    triggers: [...DEFAULT_TRIGGERS, { kind: 'platformEvent', platformEvent: `link:${linkId}` }],
    concurrency: { mode: 'latest' },
    errorPolicy: { mode: 'failStop' },
    diagnosticsLevel: 'off',
  }

  return Meta.attachMeta(wrapped, {
    definition,
    kind: 'link',
  }) as ProcessEffect<E, R>
}

type DeclarativeReadNode = {
  readonly _tag: 'readNode'
  readonly moduleId: string
  readonly tag: ModuleTag<string, AnyModuleShape>
  readonly readQuery: ReadQuery.ReadQueryCompiled<any, any>
}

type DeclarativeDispatchNode = {
  readonly _tag: 'dispatchNode'
  readonly moduleId: string
  readonly tag: ModuleTag<string, AnyModuleShape>
  readonly actionTag: string
}

type DeclarativeLinkEdgeSpec = {
  readonly from: DeclarativeReadNode
  readonly to: DeclarativeDispatchNode
}

type DeclarativeLinkHandles<Ms extends readonly LinkModuleToken<string, AnyModuleShape>[]> = {
  [M in Ms[number] as LinkModuleIdOf<M>]: {
    readonly read: <S, V>(selector: ReadQuery.ReadQueryInput<S, V>) => DeclarativeReadNode
    readonly dispatch: (actionTag: string) => DeclarativeDispatchNode
  }
}

export function linkDeclarative<Ms extends readonly LinkModuleToken<string, AnyModuleShape>[]>(
  config: LinkConfig<Ms>,
  build: ($: DeclarativeLinkHandles<Ms>) => ReadonlyArray<DeclarativeLinkEdgeSpec>,
): ProcessEffect<never, never> {
  const linkId =
    config.id ??
    [...config.modules]
      .map((m) => m.id)
      .sort()
      .join('~')

  const modulesRecord = Object.create(null) as ModulesRecord<Ms>
  const requires = new Set<string>()

  for (const module of config.modules) {
    const tag = unwrapModuleTag(module)
    requires.add(String(tag.id))
    ;(modulesRecord as Record<string, ModuleTag<string, AnyModuleShape>>)[tag.id] = tag as unknown as ModuleTag<
      string,
      AnyModuleShape
    >
  }

  const handles = Object.create(null) as DeclarativeLinkHandles<Ms>
  for (const id of Object.keys(modulesRecord) as Array<keyof ModulesRecord<Ms> & string>) {
    const tag = (modulesRecord as any)[id] as ModuleTag<string, AnyModuleShape>
    ;(handles as any)[id] = {
      read: (selector: ReadQuery.ReadQueryInput<any, any>) => {
        const compiled = ReadQuery.compile(selector)
        const staticIr = compiled.staticIr
        const ok = staticIr.lane === 'static' && staticIr.readsDigest != null && staticIr.fallbackReason == null
        if (!ok) {
          throw new Error(
            `[Process.linkDeclarative] ReadQuery must be static with readsDigest (moduleId=${id}, selectorId=${staticIr.selectorId}, lane=${staticIr.lane}, fallbackReason=${staticIr.fallbackReason}). ` +
              'Fix: use ReadQuery.make(...) or annotate selector.fieldPaths.',
          )
        }
        return { _tag: 'readNode', moduleId: id, tag, readQuery: compiled } as DeclarativeReadNode
      },
      dispatch: (actionTag: string) => {
        if (typeof actionTag !== 'string' || actionTag.length === 0) {
          throw new Error('[Process.linkDeclarative] actionTag must be a non-empty string')
        }
        return { _tag: 'dispatchNode', moduleId: id, tag, actionTag } as DeclarativeDispatchNode
      },
    }
  }

  const edges = build(handles)
  if (!Array.isArray(edges)) {
    throw new Error('[Process.linkDeclarative] build(...) must return an array of edges')
  }

  const normalized = edges
    .filter((e): e is DeclarativeLinkEdgeSpec => Boolean(e && e.from && e.to))
    .map((e) => {
      if (e.from._tag !== 'readNode' || e.to._tag !== 'dispatchNode') {
        throw new Error('[Process.linkDeclarative] Invalid edge spec returned from build(...)')
      }
      return e
    })
    .slice()
    .sort((a, b) => {
      const ak = `${a.from.moduleId}:${a.from.readQuery.staticIr.selectorId}->${a.to.moduleId}:${a.to.actionTag}`
      const bk = `${b.from.moduleId}:${b.from.readQuery.staticIr.selectorId}->${b.to.moduleId}:${b.to.actionTag}`
      return ak < bk ? -1 : ak > bk ? 1 : 0
    })

  const program: Effect.Effect<void, never, any> = Effect.gen(function* () {
    const runtime = yield* DeclarativeLinkRuntimeTag
    const collectors = yield* FiberRef.get(currentConvergeStaticIrCollectors)

    const runtimeByTag = new Map<ModuleTag<string, AnyModuleShape>, any>()
    const resolveRuntime = (tag: ModuleTag<string, AnyModuleShape>): Effect.Effect<any> =>
      Effect.suspend(() => {
        const cached = runtimeByTag.get(tag)
        if (cached) return Effect.succeed(cached)
        return (tag as any).pipe(
          Effect.tap((rt: any) =>
            Effect.sync(() => {
              runtimeByTag.set(tag, rt)
            }),
          ),
        )
      })

    const nodes: Array<any> = []
    const irEdges: Array<any> = []
    const readNodes: Array<any> = []
    const dispatchNodes: Array<any> = []

    for (let i = 0; i < normalized.length; i += 1) {
      const edge = normalized[i]
      const fromRuntime = yield* resolveRuntime(edge.from.tag)
      const toRuntime = yield* resolveRuntime(edge.to.tag)

      const fromKey = `${fromRuntime.moduleId}::${fromRuntime.instanceId}`
      const readNodeId = `r${i}`
      const dispatchNodeId = `d${i}`

      nodes.push({
        id: readNodeId,
        kind: 'readQuery',
        moduleId: fromRuntime.moduleId,
        instanceKey: fromRuntime.instanceId,
        readQuery: edge.from.readQuery.staticIr,
      })
      nodes.push({
        id: dispatchNodeId,
        kind: 'dispatch',
        moduleId: toRuntime.moduleId,
        instanceKey: toRuntime.instanceId,
        actionTag: edge.to.actionTag,
      })

      irEdges.push({ from: readNodeId, to: dispatchNodeId })

      readNodes.push({ nodeId: readNodeId, moduleInstanceKey: fromKey, readQuery: edge.from.readQuery })
      dispatchNodes.push({
        nodeId: dispatchNodeId,
        dispatch: (payload: unknown) =>
          (toRuntime.dispatch({ _tag: edge.to.actionTag, payload } as any) as any).pipe(Effect.asVoid),
      })
    }

    const ir: DeclarativeLinkIR = {
      version: 1,
      nodes,
      edges: irEdges,
    }

    const registration = {
      linkId,
      ir,
      readNodes,
      dispatchNodes,
    } as const

    const unregister = runtime.registerDeclarativeLink(registration as any)

    if (collectors.length > 0) {
      const exported = exportDeclarativeLinkIr({ linkId, ir })
      for (const collector of collectors) {
        collector.register(exported as any)
      }
    }

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unregister()
      }),
    )

    yield* Effect.never
  })

  const definition: ProcessDefinition = {
    processId: `dlink:${linkId}`,
    requires: Array.from(requires),
    triggers: DEFAULT_TRIGGERS,
    concurrency: { mode: 'latest' },
    errorPolicy: { mode: 'failStop' },
    diagnosticsLevel: 'off',
  }

  return Meta.attachMeta(program, {
    definition,
    kind: 'declarativeLink',
  }) as ProcessEffect<never, never>
}
