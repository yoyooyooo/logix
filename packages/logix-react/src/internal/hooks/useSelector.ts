import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import type * as Form from '@logixjs/form'
import { useContext, useEffect, useMemo } from 'react'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
import { RuntimeContext } from '../provider/ReactContext.js'
import type { ReactModuleHandle, StateOfHandle } from './useModuleRuntime.js'
import { useModuleRuntime } from './useModuleRuntime.js'
import { isDevEnv } from '../provider/env.js'
import { RuntimeProviderNotFoundError } from '../provider/errors.js'
import { getRuntimeReadQueryExternalStore } from '../store/RuntimeExternalStore.js'
import type { ModuleRef } from '../store/ModuleRef.js'
import { shallow } from './shallow.js'
import type {
  FieldValueAt,
  FieldValuePath,
  FieldValueSelector,
  FieldValuesAt,
  FieldValuesSelector,
} from '../../FormProjection.js'
import {
  formFieldCompanion,
  formFieldError,
  formRowCompanion,
  isFormFieldCompanionSelectorDescriptor,
  isFormFieldErrorSelectorDescriptor,
  isFormRowCompanionSelectorDescriptor,
} from '../formProjection.js'

type SelectorReadQueryInput<S, V> = RuntimeContracts.Selector.ReadQueryInput<S, V>
type SelectorFunction<S, V> = (state: S) => V
type SelectorReadQuery<S, V> = RuntimeContracts.Selector.ReadQuery<S, V>

type SelectorDescriptorInput =
  | FieldValueSelector
  | FieldValuesSelector
  | Form.Error.FormFieldErrorSelectorDescriptor
  | Form.Companion.FormFieldCompanionSelectorDescriptor
  | Form.Companion.FormRowCompanionSelectorDescriptor

type SelectorInput<S, V> = SelectorReadQueryInput<S, V> | SelectorDescriptorInput
type NonFieldValueSelectorInput<S, V> =
  | SelectorReadQueryInput<S, V>
  | Exclude<SelectorDescriptorInput, FieldValueSelector | FieldValuesSelector>

type IsAny<T> = 0 extends 1 & T ? true : false

type AnyStateFieldValues<Paths extends readonly string[]> = {
  readonly [K in keyof Paths]: any
}

type FieldValuePathOfSelector<Selector> = Selector extends FieldValueSelector<infer P> ? P : never
type FieldValuesPathsOfSelector<Selector> = Selector extends FieldValuesSelector<infer Paths> ? Paths : never
type NonEmptyFieldValuePathTuple<S extends object> = readonly [FieldValuePath<S>, ...FieldValuePath<S>[]]
type FieldValuePathTuple2<S extends object> = readonly [FieldValuePath<S>, FieldValuePath<S>]
type FieldValuePathTuple3<S extends object> = readonly [FieldValuePath<S>, FieldValuePath<S>, FieldValuePath<S>]
type FieldValuePathTuple4<S extends object> = readonly [
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
]
type FieldValuePathTuple5<S extends object> = readonly [
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
]
type FieldValuePathTuple6<S extends object> = readonly [
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
]
type FieldValuePathTuple7<S extends object> = readonly [
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
]
type FieldValuePathTuple8<S extends object> = readonly [
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
]
type FieldValuePathTuple9<S extends object> = readonly [
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
]
type FieldValuePathTuple10<S extends object> = readonly [
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
  FieldValuePath<S>,
]
type FieldValuesSelectorGate<S extends object, Selector> =
  FieldValuesPathsOfSelector<Selector> extends NonEmptyFieldValuePathTuple<S> ? unknown : never
type FieldProjectionSelectorInput =
  | FieldValueSelector<string>
  | FieldValuesSelector<readonly [string, ...string[]]>
type FieldProjectionSelectorContext<S extends object> =
  | FieldValueSelector<FieldValuePath<S>>
  | FieldValuesSelector<readonly [FieldValuePath<S>]>
  | FieldValuesSelector<FieldValuePathTuple2<S>>
  | FieldValuesSelector<FieldValuePathTuple3<S>>
  | FieldValuesSelector<FieldValuePathTuple4<S>>
  | FieldValuesSelector<FieldValuePathTuple5<S>>
  | FieldValuesSelector<FieldValuePathTuple6<S>>
  | FieldValuesSelector<FieldValuePathTuple7<S>>
  | FieldValuesSelector<FieldValuePathTuple8<S>>
  | FieldValuesSelector<FieldValuePathTuple9<S>>
  | FieldValuesSelector<FieldValuePathTuple10<S>>
  | FieldValuesSelector<NonEmptyFieldValuePathTuple<S>>
type FieldProjectionSelectorGate<S extends object, Selector> =
  Selector extends FieldValueSelector<infer P>
    ? P extends FieldValuePath<S>
      ? unknown
      : never
    : Selector extends FieldValuesSelector<infer Paths>
      ? Paths extends NonEmptyFieldValuePathTuple<S>
        ? unknown
        : never
      : never
type FieldProjectionSelectorResult<S extends object, Selector> =
  Selector extends FieldValueSelector<infer P>
    ? P extends FieldValuePath<S>
      ? FieldValueAt<S, P>
      : never
    : Selector extends FieldValuesSelector<infer Paths>
      ? Paths extends readonly FieldValuePath<S>[]
        ? FieldValuesAt<S, Paths>
        : never
      : never

type FormCompanionMetadataOfHandle<H> = H extends { readonly def?: Form.FormProgram<any, any, any, infer Metadata> }
  ? Metadata
  : H extends { readonly def?: Form.FormProgram<any, any, any, infer Metadata> | undefined }
    ? Metadata
    : H extends Form.FormProgram<any, any, any, infer Metadata>
      ? Metadata
      : {}

type FormCompanionFieldPathOfDescriptor<Descriptor> = Descriptor extends Form.Companion.FormFieldCompanionSelectorDescriptor<
  infer P
>
  ? P
  : never

type FormCompanionRowPathOfDescriptor<Descriptor> = Descriptor extends Form.Companion.FormRowCompanionSelectorDescriptor<
  infer ListPath,
  infer FieldPath
>
  ? `${ListPath}.${FieldPath}`
  : never

type FormCompanionResult<Metadata, P extends string> = string extends P
  ? unknown
  : P extends keyof Metadata
    ? Metadata[P]
    : unknown

export function useSelector<
  S extends object,
  A,
  Tags extends string,
  Def,
  Dispatchers,
  Selector extends FieldProjectionSelectorInput,
>(
  handle: ModuleRef<S, A, Tags, Def, Dispatchers>,
  selector: IsAny<S> extends true
    ? never
    : FieldProjectionSelectorContext<S> | (Selector & FieldProjectionSelectorGate<S, Selector>),
  equalityFn?: (
    previous: FieldProjectionSelectorResult<S, Selector>,
    next: FieldProjectionSelectorResult<S, Selector>,
  ) => boolean,
): FieldProjectionSelectorResult<S, Selector>

export function useSelector<
  S extends object,
  A,
  Tags extends string,
  Def,
  Dispatchers,
  Selector extends FieldValueSelector<FieldValuePath<S>>,
>(
  handle: ModuleRef<S, A, Tags, Def, Dispatchers>,
  selector: Selector,
  equalityFn?: (
    previous: FieldValueAt<S, FieldValuePathOfSelector<Selector> & FieldValuePath<S>>,
    next: FieldValueAt<S, FieldValuePathOfSelector<Selector> & FieldValuePath<S>>,
  ) => boolean,
): FieldValueAt<S, FieldValuePathOfSelector<Selector> & FieldValuePath<S>>

export function useSelector<S extends object, A, Tags extends string, Def, Dispatchers, P extends string>(
  handle: ModuleRef<S, A, Tags, Def, Dispatchers>,
  selector: IsAny<S> extends true ? FieldValueSelector<P> : never,
  equalityFn?: (previous: any, next: any) => boolean,
): any

export function useSelector<
  S extends object,
  A,
  Tags extends string,
  Def,
  Dispatchers,
  Selector extends FieldValuesSelector<readonly [string, ...string[]]>,
>(
  handle: ModuleRef<S, A, Tags, Def, Dispatchers>,
  selector: FieldValuesSelector<NonEmptyFieldValuePathTuple<S>> | (Selector & FieldValuesSelectorGate<S, Selector>),
  equalityFn?: (
    previous: FieldValuesAt<S, FieldValuesPathsOfSelector<Selector> & readonly FieldValuePath<S>[]>,
    next: FieldValuesAt<S, FieldValuesPathsOfSelector<Selector> & readonly FieldValuePath<S>[]>,
  ) => boolean,
): FieldValuesAt<S, FieldValuesPathsOfSelector<Selector> & readonly FieldValuePath<S>[]>

export function useSelector<S extends object, A, Tags extends string, Def, Dispatchers, Paths extends readonly string[]>(
  handle: ModuleRef<S, A, Tags, Def, Dispatchers>,
  selector: IsAny<S> extends true ? FieldValuesSelector<Paths> : never,
  equalityFn?: (previous: AnyStateFieldValues<Paths>, next: AnyStateFieldValues<Paths>) => boolean,
): AnyStateFieldValues<Paths>

export function useSelector<S, A, Tags extends string, Def, Dispatchers, V>(
  handle: ModuleRef<S, A, Tags, Def, Dispatchers>,
  selector: SelectorFunction<S, V>,
  equalityFn?: (previous: V, next: V) => boolean,
): V

export function useSelector<S, A, Tags extends string, Def, Dispatchers, V>(
  handle: ModuleRef<S, A, Tags, Def, Dispatchers>,
  selector: SelectorReadQuery<S, V>,
  equalityFn?: (previous: V, next: V) => boolean,
): V

export function useSelector<S, A, Tags extends string, Def, Dispatchers>(
  handle: ModuleRef<S, A, Tags, Def, Dispatchers>,
  selector: Form.Error.FormFieldErrorSelectorDescriptor,
  equalityFn?: (
    previous: Form.Error.FormFieldExplainResult,
    next: Form.Error.FormFieldExplainResult,
  ) => boolean,
): Form.Error.FormFieldExplainResult

export function useSelector<
  S,
  A,
  Tags extends string,
  Def,
  Dispatchers,
  Descriptor extends Form.Companion.FormFieldCompanionSelectorDescriptor,
>(
  handle: ModuleRef<S, A, Tags, Def, Dispatchers>,
  selector: Descriptor,
  equalityFn?: (
    previous: FormCompanionResult<
      FormCompanionMetadataOfHandle<ModuleRef<S, A, Tags, Def, Dispatchers>>,
      FormCompanionFieldPathOfDescriptor<Descriptor>
    >,
    next: FormCompanionResult<
      FormCompanionMetadataOfHandle<ModuleRef<S, A, Tags, Def, Dispatchers>>,
      FormCompanionFieldPathOfDescriptor<Descriptor>
    >,
  ) => boolean,
): FormCompanionResult<
  FormCompanionMetadataOfHandle<ModuleRef<S, A, Tags, Def, Dispatchers>>,
  FormCompanionFieldPathOfDescriptor<Descriptor>
>

export function useSelector<
  S,
  A,
  Tags extends string,
  Def,
  Dispatchers,
  Descriptor extends Form.Companion.FormRowCompanionSelectorDescriptor,
>(
  handle: ModuleRef<S, A, Tags, Def, Dispatchers>,
  selector: Descriptor,
  equalityFn?: (
    previous: FormCompanionResult<
      FormCompanionMetadataOfHandle<ModuleRef<S, A, Tags, Def, Dispatchers>>,
      FormCompanionRowPathOfDescriptor<Descriptor>
    >,
    next: FormCompanionResult<
      FormCompanionMetadataOfHandle<ModuleRef<S, A, Tags, Def, Dispatchers>>,
      FormCompanionRowPathOfDescriptor<Descriptor>
    >,
  ) => boolean,
): FormCompanionResult<
  FormCompanionMetadataOfHandle<ModuleRef<S, A, Tags, Def, Dispatchers>>,
  FormCompanionRowPathOfDescriptor<Descriptor>
>

export function useSelector<S, A, Tags extends string, Def, Dispatchers, V>(
  handle: ModuleRef<S, A, Tags, Def, Dispatchers>,
  selector: NonFieldValueSelectorInput<S, V>,
  equalityFn?: (previous: V, next: V) => boolean,
): V

export function useSelector<
  H extends ReactModuleHandle,
  Selector extends FieldProjectionSelectorInput,
>(
  handle: H,
  selector: IsAny<StateOfHandle<H>> extends true
    ? never
    : FieldProjectionSelectorContext<StateOfHandle<H>>
      | (Selector & FieldProjectionSelectorGate<StateOfHandle<H>, Selector>),
  equalityFn?: (
    previous: FieldProjectionSelectorResult<StateOfHandle<H>, Selector>,
    next: FieldProjectionSelectorResult<StateOfHandle<H>, Selector>,
  ) => boolean,
): FieldProjectionSelectorResult<StateOfHandle<H>, Selector>

export function useSelector<H extends ReactModuleHandle, Selector extends FieldValueSelector<FieldValuePath<StateOfHandle<H>>>>(
  handle: H,
  selector: Selector,
  equalityFn?: (
    previous: FieldValueAt<StateOfHandle<H>, FieldValuePathOfSelector<Selector> & FieldValuePath<StateOfHandle<H>>>,
    next: FieldValueAt<StateOfHandle<H>, FieldValuePathOfSelector<Selector> & FieldValuePath<StateOfHandle<H>>>,
  ) => boolean,
): FieldValueAt<StateOfHandle<H>, FieldValuePathOfSelector<Selector> & FieldValuePath<StateOfHandle<H>>>

export function useSelector<H extends ReactModuleHandle, P extends string>(
  handle: H,
  selector: IsAny<StateOfHandle<H>> extends true ? FieldValueSelector<P> : never,
  equalityFn?: (previous: any, next: any) => boolean,
): any

export function useSelector<
  H extends ReactModuleHandle,
  Selector extends FieldValuesSelector<readonly [string, ...string[]]>,
>(
  handle: H,
  selector:
    | FieldValuesSelector<NonEmptyFieldValuePathTuple<StateOfHandle<H>>>
    | (Selector & FieldValuesSelectorGate<StateOfHandle<H>, Selector>),
  equalityFn?: (
    previous: FieldValuesAt<
      StateOfHandle<H>,
      FieldValuesPathsOfSelector<Selector> & readonly FieldValuePath<StateOfHandle<H>>[]
    >,
    next: FieldValuesAt<
      StateOfHandle<H>,
      FieldValuesPathsOfSelector<Selector> & readonly FieldValuePath<StateOfHandle<H>>[]
    >,
  ) => boolean,
): FieldValuesAt<StateOfHandle<H>, FieldValuesPathsOfSelector<Selector> & readonly FieldValuePath<StateOfHandle<H>>[]>

export function useSelector<H extends ReactModuleHandle, Paths extends readonly string[]>(
  handle: H,
  selector: IsAny<StateOfHandle<H>> extends true ? FieldValuesSelector<Paths> : never,
  equalityFn?: (previous: AnyStateFieldValues<Paths>, next: AnyStateFieldValues<Paths>) => boolean,
): AnyStateFieldValues<Paths>

export function useSelector<H extends ReactModuleHandle, V>(
  handle: H,
  selector: SelectorFunction<StateOfHandle<H>, V>,
  equalityFn?: (previous: V, next: V) => boolean,
): V

export function useSelector<H extends ReactModuleHandle, V>(
  handle: H,
  selector: SelectorReadQuery<StateOfHandle<H>, V>,
  equalityFn?: (previous: V, next: V) => boolean,
): V

export function useSelector<H extends ReactModuleHandle>(
  handle: H,
  selector: Form.Error.FormFieldErrorSelectorDescriptor,
  equalityFn?: (
    previous: Form.Error.FormFieldExplainResult,
    next: Form.Error.FormFieldExplainResult,
  ) => boolean,
): Form.Error.FormFieldExplainResult

export function useSelector<H extends ReactModuleHandle, Descriptor extends Form.Companion.FormFieldCompanionSelectorDescriptor>(
  handle: H,
  selector: Descriptor,
  equalityFn?: (
    previous: FormCompanionResult<FormCompanionMetadataOfHandle<H>, FormCompanionFieldPathOfDescriptor<Descriptor>>,
    next: FormCompanionResult<FormCompanionMetadataOfHandle<H>, FormCompanionFieldPathOfDescriptor<Descriptor>>,
  ) => boolean,
): FormCompanionResult<FormCompanionMetadataOfHandle<H>, FormCompanionFieldPathOfDescriptor<Descriptor>>

export function useSelector<H extends ReactModuleHandle, Descriptor extends Form.Companion.FormRowCompanionSelectorDescriptor>(
  handle: H,
  selector: Descriptor,
  equalityFn?: (
    previous: FormCompanionResult<FormCompanionMetadataOfHandle<H>, FormCompanionRowPathOfDescriptor<Descriptor>>,
    next: FormCompanionResult<FormCompanionMetadataOfHandle<H>, FormCompanionRowPathOfDescriptor<Descriptor>>,
  ) => boolean,
): FormCompanionResult<FormCompanionMetadataOfHandle<H>, FormCompanionRowPathOfDescriptor<Descriptor>>

export function useSelector<H extends ReactModuleHandle, V>(
  handle: H,
  selector: NonFieldValueSelectorInput<StateOfHandle<H>, V>,
  equalityFn?: (previous: V, next: V) => boolean,
): V

export function useSelector<H extends ReactModuleHandle>(
  handle: H,
  selector: any,
  equalityFn?: any,
): any {
  const runtimeContext = useContext(RuntimeContext)
  if (!runtimeContext) {
    throw new RuntimeProviderNotFoundError('useSelector')
  }

  const runtime = runtimeContext.runtime
  const moduleRuntime = useModuleRuntime(handle)

  const normalizedSelector = useMemo<SelectorReadQueryInput<StateOfHandle<H>, any>>(
    () =>
      isFormFieldErrorSelectorDescriptor(selector)
        ? formFieldError(selector)
        : isFormFieldCompanionSelectorDescriptor(selector)
          ? formFieldCompanion(selector)
          : isFormRowCompanionSelectorDescriptor(selector)
            ? formRowCompanion(selector, moduleRuntime)
            : selector,
    [moduleRuntime, selector],
  )

  const selectorReadQuery = useMemo<RuntimeContracts.Selector.ReadQueryCompiled<StateOfHandle<H>, any>>(
    () =>
      RuntimeContracts.Selector.isReadQuery(normalizedSelector)
        ? RuntimeContracts.Selector.compile(normalizedSelector)
        : typeof normalizedSelector === 'function'
          ? RuntimeContracts.Selector.compile(normalizedSelector)
          : RuntimeContracts.Selector.compile(normalizedSelector as any),
    [normalizedSelector],
  )

  const selectorRoute = useMemo(
    () => RuntimeContracts.Selector.route(selectorReadQuery),
    [selectorReadQuery],
  )

  if (selectorRoute.kind === 'reject') {
    throw RuntimeContracts.Selector.makeSelectorRouteError(selectorRoute)
  }

  const actualEqualityFn = useMemo(() => {
    if (typeof equalityFn === 'function') return equalityFn
    if (selectorReadQuery?.equalsKind === 'custom' && typeof selectorReadQuery.equals === 'function') {
      return selectorReadQuery.equals
    }
    return selectorReadQuery?.equalsKind === 'shallowStruct' ? shallow : Object.is
  }, [equalityFn, selectorReadQuery])

  const store = useMemo(
    () =>
      getRuntimeReadQueryExternalStore(runtime, moduleRuntime, selectorReadQuery, selectorRoute, {
        lowPriorityDelayMs: runtimeContext.reactConfigSnapshot.lowPriorityDelayMs,
        lowPriorityMaxDelayMs: runtimeContext.reactConfigSnapshot.lowPriorityMaxDelayMs,
      }),
    [
      moduleRuntime,
      runtime,
      runtimeContext.reactConfigSnapshot.lowPriorityDelayMs,
      runtimeContext.reactConfigSnapshot.lowPriorityMaxDelayMs,
      selectorReadQuery,
      selectorRoute,
    ],
  )

  const selected = useSyncExternalStoreWithSelector<unknown, any>(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot ?? store.getSnapshot,
    (snapshot) => snapshot as any,
    actualEqualityFn,
  )

  // Emit a trace:react-selector Debug event after React commit:
  // - Enabled only in dev/test to avoid production overhead.
  // - Normalized via DebugSink -> RuntimeDebugEventRef for Devtools consumption.
  useEffect(() => {
    if (!isDevEnv() && !CoreDebug.isDevtoolsEnabled()) {
      return
    }

    const instanceId = moduleRuntime.instanceId

    type SelectorMeta = {
      readonly fieldPaths?: unknown
      readonly debugKey?: unknown
    }

    let fieldPaths: ReadonlyArray<string> | undefined
    let selectorKey: string | undefined

    const meta = normalizedSelector as typeof normalizedSelector & SelectorMeta

    if (RuntimeContracts.Selector.isReadQuery(normalizedSelector)) {
      const paths = normalizedSelector.reads.filter((read): read is string => typeof read === 'string')
      fieldPaths = paths.length > 0 ? paths.slice() : undefined
      selectorKey =
        typeof normalizedSelector.debugKey === 'string' && normalizedSelector.debugKey.length > 0
          ? normalizedSelector.debugKey
          : normalizedSelector.selectorId
    } else {
      const rawFieldPaths = meta.fieldPaths
      if (Array.isArray(rawFieldPaths)) {
        const paths = rawFieldPaths.filter((p): p is string => typeof p === 'string')
        fieldPaths = paths.length > 0 ? paths.slice() : undefined
      }

      const rawDebugKey = meta.debugKey
      selectorKey =
        typeof rawDebugKey === 'string' && rawDebugKey.length > 0
          ? rawDebugKey
          : typeof normalizedSelector === 'function' && typeof normalizedSelector.name === 'string' && normalizedSelector.name.length > 0
            ? normalizedSelector.name
            : undefined
    }

    const effect = CoreDebug.record({
      type: 'trace:react-selector',
      moduleId: moduleRuntime.moduleId,
      instanceId,
      data: {
        componentLabel: 'useSelector',
        selectorKey,
        fieldPaths,
        selectorId: selectorReadQuery?.selectorId,
        lane: selectorReadQuery?.lane,
        producer: selectorReadQuery?.producer,
        fallbackReason: selectorReadQuery?.fallbackReason,
        readsDigest: selectorReadQuery?.readsDigest,
        equalsKind: selectorReadQuery?.equalsKind,
        strictModePhase: 'commit',
        selectorQuality: RuntimeContracts.Selector.toSelectorQualityArtifact({
          stage: 'host-harness',
          producer: 'react.useSelector',
          route: selectorRoute,
        }),
      },
    })

    runtime.runFork(effect)
  }, [runtime, moduleRuntime, normalizedSelector, selected, selectorReadQuery, selectorRoute])

  return selected
}
