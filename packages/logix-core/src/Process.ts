import { Effect } from 'effect'
import * as ModuleFactory from './internal/runtime/ModuleFactory.js'
import type * as Protocol from './internal/runtime/core/process/protocol.js'
import * as Meta from './internal/runtime/core/process/meta.js'
import type { AnyModuleShape, ModuleHandle, ModuleLike, ModuleTag } from './internal/module.js'

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
): ModuleTag<Id, Sh> => (isModuleLike(module) ? module.tag : module)

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

  const definition: ProcessDefinition = {
    processId: linkId,
    requires: Array.from(requires),
    triggers: [...DEFAULT_TRIGGERS, { kind: 'platformEvent', platformEvent: `link:${linkId}` }],
    concurrency: { mode: 'latest' },
    errorPolicy: { mode: 'failStop' },
    diagnosticsLevel: 'off',
  }

  return Meta.attachMeta(effect, {
    definition,
    kind: 'link',
  }) as ProcessEffect<E, R>
}
