import { fnv1a32, stableStringify } from '../../digest.js'
import type * as DebugSink from './DebugSink.js'

export type ReadLane = 'static' | 'dynamic'

export type ReadProducer = 'aot' | 'jit' | 'manual' | 'dynamic'

export type ReadQueryFallbackReason = 'missingDeps' | 'unsupportedSyntax' | 'unstableSelectorId'

export type EqualsKind = 'objectIs' | 'shallowStruct' | 'custom'

export interface ReadsDigest {
  readonly count: number
  readonly hash: number
}

export interface ReadQueryStaticIr {
  readonly selectorId: string
  readonly debugKey?: string
  readonly lane: ReadLane
  readonly producer: ReadProducer
  readonly reads?: ReadonlyArray<string | number>
  readonly readsDigest?: ReadsDigest
  readonly fallbackReason?: ReadQueryFallbackReason
  readonly equalsKind: EqualsKind
}

export interface ReadQuery<S, V> {
  readonly selectorId: string
  readonly debugKey?: string
  readonly reads: ReadonlyArray<string | number>
  readonly select: (state: S) => V
  readonly equalsKind: EqualsKind
  readonly equals?: (previous: V, next: V) => boolean
}

export interface ReadQueryCompiled<S, V> extends ReadQuery<S, V> {
  readonly lane: ReadLane
  readonly producer: ReadProducer
  readonly readsDigest?: ReadsDigest
  readonly fallbackReason?: ReadQueryFallbackReason
  readonly staticIr: ReadQueryStaticIr
}

export type ReadQueryInput<S, V> = ((state: S) => V) | ReadQuery<S, V>

export function isReadQuery<S, V>(input: ReadQueryInput<S, V>): input is ReadQuery<S, V>
export function isReadQuery(input: unknown): input is ReadQuery<any, any>
export function isReadQuery(input: unknown): input is ReadQuery<any, any> {
  if (!input || (typeof input !== 'object' && typeof input !== 'function')) return false
  const maybe = input as any
  return typeof maybe.selectorId === 'string' && typeof maybe.select === 'function' && Array.isArray(maybe.reads)
}

const normalizeReads = (reads: ReadonlyArray<string | number>): ReadonlyArray<string | number> => {
  const unique: Array<string | number> = []
  const seen = new Set<string>()
  for (const r of reads) {
    const key = typeof r === 'number' ? `n:${r}` : `s:${r}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(r)
  }
  return unique.slice().sort()
}

const toHash32Number = (hex: string): number => Number.parseInt(hex, 16)

const makeReadsDigest = (reads: ReadonlyArray<string | number>): ReadsDigest => {
  const normalized = normalizeReads(reads)
  return {
    count: normalized.length,
    hash: toHash32Number(fnv1a32(stableStringify(normalized))),
  }
}

const computeSelectorId = (value: unknown): string => `rq_${fnv1a32(stableStringify(value))}`

let nextUnstableSelectorSeq = 0
const unstableSelectorIdByFn = new WeakMap<Function, string>()

const computeUnstableSelectorId = (selector: Function): string => {
  const existing = unstableSelectorIdByFn.get(selector)
  if (existing) return existing
  nextUnstableSelectorSeq += 1
  const selectorId = `rq_u${nextUnstableSelectorSeq}`
  unstableSelectorIdByFn.set(selector, selectorId)
  return selectorId
}

const unwrapParens = (input: string): string => {
  const trimmed = input.trim()
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    const inner = trimmed.slice(1, -1).trim()
    // Only unwrap the outermost pair of parentheses to avoid accidentally breaking syntax.
    if (!inner.startsWith('(') || !inner.endsWith(')')) {
      return inner
    }
  }
  return trimmed
}

const extractArrow = (source: string): { readonly param: string; readonly body: string } | undefined => {
  const idx = source.indexOf('=>')
  if (idx < 0) return undefined
  const left = source.slice(0, idx).trim()
  const right = source.slice(idx + 2).trim()

  const paramRaw = unwrapParens(left)
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(paramRaw)) return undefined

  // block body: { return expr }
  if (right.startsWith('{')) {
    const m = right.match(/^\{\s*return\s+(.+?);?\s*\}\s*$/s)
    if (!m) return undefined
    return { param: paramRaw, body: m[1]?.trim() ?? '' }
  }

  return { param: paramRaw, body: right }
}

const extractFunctionReturn = (source: string): { readonly param: string; readonly body: string } | undefined => {
  const trimmed = source.trim()
  const m = trimmed.match(
    /^function\s*(?:[A-Za-z_$][A-Za-z0-9_$]*\s*)?\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)\s*\{\s*return\s+(.+?);?\s*\}\s*$/s,
  )
  if (!m) return undefined

  const param = m[1]?.trim() ?? ''
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(param)) return undefined

  const body = m[2]?.trim() ?? ''
  if (body.length === 0) return undefined

  return { param, body }
}

type ParsedSelector =
  | { readonly kind: 'path'; readonly path: string }
  | { readonly kind: 'struct'; readonly entries: ReadonlyArray<readonly [string, string]> }

const tryParseSelectorSource = (source: string): ParsedSelector | undefined => {
  const arrowOrFn = extractArrow(source) ?? extractFunctionReturn(source)
  if (!arrowOrFn) return undefined

  const expr = unwrapParens(arrowOrFn.body).trim().replace(/;$/, '').trim()

  // path: s.a.b
  {
    const re = new RegExp(`^${arrowOrFn.param}\\.([A-Za-z0-9_$]+(?:\\.[A-Za-z0-9_$]+)*)$`)
    const m = expr.match(re)
    if (m) {
      return { kind: 'path', path: m[1] }
    }
  }

  // struct: ({ a: s.a, b: s.b })
  if (expr.startsWith('{') && expr.endsWith('}')) {
    const inner = expr.slice(1, -1).trim()
    if (inner.length === 0) return { kind: 'struct', entries: [] }

    const parts = inner
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)

    const entries: Array<readonly [string, string]> = []

    for (const part of parts) {
      const idx = part.indexOf(':')
      if (idx < 0) return undefined
      const key = part.slice(0, idx).trim()
      const value = part.slice(idx + 1).trim()

      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return undefined

      const re = new RegExp(`^${arrowOrFn.param}\\.([A-Za-z0-9_$]+(?:\\.[A-Za-z0-9_$]+)*)$`)
      const m = value.match(re)
      if (!m) return undefined
      entries.push([key, m[1]] as const)
    }

    // Sort entries to ensure a stable selectorId.
    entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    return { kind: 'struct', entries }
  }

  return undefined
}

type ReadQueryStaticTemplate = {
  readonly selectorId: string
  readonly reads: ReadonlyArray<string | number>
  readonly readsDigest: ReadsDigest
  readonly equalsKind: EqualsKind
}

const READ_QUERY_TEMPLATE_CACHE_MAX = 2048
const readQueryTemplateByFn = new WeakMap<Function, ReadQueryStaticTemplate>()
const readQueryTemplateBySource = new Map<string, ReadQueryStaticTemplate>()

const lruGet = <K, V>(map: Map<K, V>, key: K): V | undefined => {
  const value = map.get(key)
  if (value === undefined) return undefined
  map.delete(key)
  map.set(key, value)
  return value
}

const lruSet = <K, V>(map: Map<K, V>, key: K, value: V, maxSize: number) => {
  if (map.has(key)) map.delete(key)
  map.set(key, value)
  if (map.size <= maxSize) return
  const oldestKey = map.keys().next().value as K | undefined
  if (oldestKey !== undefined) {
    map.delete(oldestKey)
  }
}

const safeToString = (fn: Function): string => {
  try {
    return fn.toString()
  } catch {
    return ''
  }
}

export const make = <S, V>(spec: ReadQuery<S, V>): ReadQuery<S, V> => spec

export const compile = <S, V>(input: ReadQueryInput<S, V>): ReadQueryCompiled<S, V> => {
  if (isReadQuery(input)) {
    const reads = normalizeReads(input.reads)
    const readsDigest = reads.length > 0 ? makeReadsDigest(reads) : undefined

    const equalsKind = input.equalsKind
    const staticIr: ReadQueryStaticIr = {
      selectorId: input.selectorId,
      debugKey: input.debugKey,
      lane: 'static',
      producer: 'manual',
      reads,
      readsDigest,
      equalsKind,
    }

    return {
      ...input,
      reads,
      lane: 'static',
      producer: 'manual',
      readsDigest,
      staticIr,
    }
  }

  const selector = input
  const debugKey =
    (typeof (selector as any)?.debugKey === 'string' && (selector as any).debugKey.length > 0
      ? (selector as any).debugKey
      : undefined) ??
    (typeof (selector as any).name === 'string' && (selector as any).name.length > 0
      ? (selector as any).name
      : undefined)

  const declaredReads: ReadonlyArray<string> | undefined = Array.isArray((selector as any)?.fieldPaths)
    ? ((selector as any).fieldPaths as ReadonlyArray<unknown>).filter((x): x is string => typeof x === 'string')
    : undefined

  if (declaredReads && declaredReads.length > 0) {
    const reads = normalizeReads(declaredReads)
    const readsDigest = makeReadsDigest(reads)
    const selectorId = computeSelectorId({ kind: 'reads', reads })

    const staticIr: ReadQueryStaticIr = {
      selectorId,
      debugKey,
      lane: 'static',
      producer: 'jit',
      reads,
      readsDigest,
      equalsKind: 'objectIs',
    }

    return {
      selectorId,
      debugKey,
      reads,
      select: selector as any,
      equalsKind: 'objectIs',
      lane: 'static',
      producer: 'jit',
      readsDigest,
      staticIr,
    }
  }

  const cachedByFn = readQueryTemplateByFn.get(selector as unknown as Function)
  if (cachedByFn) {
    const staticIr: ReadQueryStaticIr = {
      selectorId: cachedByFn.selectorId,
      debugKey,
      lane: 'static',
      producer: 'jit',
      reads: cachedByFn.reads,
      readsDigest: cachedByFn.readsDigest,
      equalsKind: cachedByFn.equalsKind,
    }

    return {
      selectorId: cachedByFn.selectorId,
      debugKey,
      reads: cachedByFn.reads,
      select: selector as any,
      equalsKind: cachedByFn.equalsKind,
      lane: 'static',
      producer: 'jit',
      readsDigest: cachedByFn.readsDigest,
      staticIr,
    }
  }

  const srcTrimmed = safeToString(selector as unknown as Function).trim()
  const cachedBySource = srcTrimmed.length > 0 ? lruGet(readQueryTemplateBySource, srcTrimmed) : undefined
  if (cachedBySource) {
    readQueryTemplateByFn.set(selector as unknown as Function, cachedBySource)
    const staticIr: ReadQueryStaticIr = {
      selectorId: cachedBySource.selectorId,
      debugKey,
      lane: 'static',
      producer: 'jit',
      reads: cachedBySource.reads,
      readsDigest: cachedBySource.readsDigest,
      equalsKind: cachedBySource.equalsKind,
    }

    return {
      selectorId: cachedBySource.selectorId,
      debugKey,
      reads: cachedBySource.reads,
      select: selector as any,
      equalsKind: cachedBySource.equalsKind,
      lane: 'static',
      producer: 'jit',
      readsDigest: cachedBySource.readsDigest,
      staticIr,
    }
  }

  const parsed = srcTrimmed.length > 0 ? tryParseSelectorSource(srcTrimmed) : undefined

  if (parsed?.kind === 'path') {
    const reads = [parsed.path]
    const readsDigest = makeReadsDigest(reads)
    const selectorId = computeSelectorId({ kind: 'path', path: parsed.path })
    const template: ReadQueryStaticTemplate = { selectorId, reads, readsDigest, equalsKind: 'objectIs' }
    readQueryTemplateByFn.set(selector as unknown as Function, template)
    lruSet(readQueryTemplateBySource, srcTrimmed, template, READ_QUERY_TEMPLATE_CACHE_MAX)

    const staticIr: ReadQueryStaticIr = {
      selectorId,
      debugKey,
      lane: 'static',
      producer: 'jit',
      reads,
      readsDigest,
      equalsKind: 'objectIs',
    }

    return {
      selectorId,
      debugKey,
      reads,
      select: selector as any,
      equalsKind: 'objectIs',
      lane: 'static',
      producer: 'jit',
      readsDigest,
      staticIr,
    }
  }

  if (parsed?.kind === 'struct') {
    const reads = normalizeReads(parsed.entries.map(([, path]) => path))
    const readsDigest = makeReadsDigest(reads)
    const selectorId = computeSelectorId({ kind: 'struct', entries: parsed.entries })
    const template: ReadQueryStaticTemplate = { selectorId, reads, readsDigest, equalsKind: 'shallowStruct' }
    readQueryTemplateByFn.set(selector as unknown as Function, template)
    lruSet(readQueryTemplateBySource, srcTrimmed, template, READ_QUERY_TEMPLATE_CACHE_MAX)

    const staticIr: ReadQueryStaticIr = {
      selectorId,
      debugKey,
      lane: 'static',
      producer: 'jit',
      reads,
      readsDigest,
      equalsKind: 'shallowStruct',
    }

    return {
      selectorId,
      debugKey,
      reads,
      select: selector as any,
      equalsKind: 'shallowStruct',
      lane: 'static',
      producer: 'jit',
      readsDigest,
      staticIr,
    }
  }

  // Dynamic lane fallback (no stable reads / unsupported subset)
  const baseFallbackReason: ReadQueryFallbackReason =
    srcTrimmed.includes('=>') || srcTrimmed.startsWith('function') ? 'unsupportedSyntax' : 'missingDeps'

  const lowDiscriminabilitySource = srcTrimmed.length === 0 || srcTrimmed.includes('[native code]')
  const fallbackReason: ReadQueryFallbackReason =
    !debugKey || lowDiscriminabilitySource ? 'unstableSelectorId' : baseFallbackReason

  const selectorId =
    fallbackReason === 'unstableSelectorId'
      ? computeUnstableSelectorId(selector as unknown as Function)
      : computeSelectorId({ kind: 'dynamic', debugKey, src: srcTrimmed })
  const staticIr: ReadQueryStaticIr = {
    selectorId,
    debugKey,
    lane: 'dynamic',
    producer: 'dynamic',
    fallbackReason,
    equalsKind: 'objectIs',
  }

  return {
    selectorId,
    debugKey,
    reads: [],
    select: selector as any,
    equalsKind: 'objectIs',
    lane: 'dynamic',
    producer: 'dynamic',
    fallbackReason,
    staticIr,
  }
}

export interface ReadQueryStrictGateConfig {
  readonly mode: 'off' | 'warn' | 'error'
  readonly requireStatic?: {
    readonly selectorIds?: ReadonlyArray<string>
    readonly modules?: ReadonlyArray<string>
  }
  readonly denyFallbackReasons?: ReadonlyArray<ReadQueryFallbackReason>
}

export interface ReadQueryStrictGateViolationDetails {
  readonly moduleId: string
  readonly instanceId: string
  readonly txnSeq: number
  readonly selectorId: string
  readonly debugKey?: string
  readonly fallbackReason: ReadQueryFallbackReason
  readonly rule: 'denyFallbackReason' | 'requireStatic:global' | 'requireStatic:selectorId' | 'requireStatic:module'
}

export interface ReadQueryStrictGateError extends Error {
  readonly _tag: 'ReadQueryStrictGateError'
  readonly details: ReadQueryStrictGateViolationDetails
}

export type ReadQueryStrictGateDiagnosticEvent = Extract<DebugSink.Event, { readonly type: 'diagnostic' }>

export type ReadQueryStrictGateDecision =
  | { readonly verdict: 'PASS' }
  | {
      readonly verdict: 'WARN'
      readonly diagnostic: ReadQueryStrictGateDiagnosticEvent
      readonly details: ReadQueryStrictGateViolationDetails
    }
  | {
      readonly verdict: 'FAIL'
      readonly diagnostic: ReadQueryStrictGateDiagnosticEvent
      readonly error: ReadQueryStrictGateError
      readonly details: ReadQueryStrictGateViolationDetails
    }

const filterNonEmpty = (values: ReadonlyArray<string> | undefined): ReadonlyArray<string> | undefined => {
  if (!values || values.length === 0) return undefined
  const next = values.map((v) => v.trim()).filter((v) => v.length > 0)
  return next.length > 0 ? next : undefined
}

const makeStrictGateDiagnostic = (args: {
  readonly config: ReadQueryStrictGateConfig
  readonly details: ReadQueryStrictGateViolationDetails
}): ReadQueryStrictGateDiagnosticEvent => {
  const severity = args.config.mode === 'warn' ? ('warning' as const) : ('error' as const)

  return {
    type: 'diagnostic',
    moduleId: args.details.moduleId,
    instanceId: args.details.instanceId,
    txnSeq: args.details.txnSeq,
    code: 'read_query::strict_gate',
    severity,
    message: `ReadQuery strict gate violated: selector entered dynamic lane (selectorId=${args.details.selectorId}, reason=${args.details.fallbackReason}).`,
    hint:
      'Fix: make the selector statically compilable (AOT/JIT) or pass an explicit ReadQuery; ' +
      'or disable/narrow the gate via RuntimeOptions.readQuery.strictGate.requireStatic / denyFallbackReasons.',
    kind: 'read_query:strict_gate',
    trigger: {
      kind: 'read_query',
      name: 'strict_gate',
      details: args.details,
    },
  }
}

const makeStrictGateError = (args: {
  readonly details: ReadQueryStrictGateViolationDetails
}): ReadQueryStrictGateError =>
  Object.assign(
    new Error(
      `[ReadQueryStrictGateError] selector entered dynamic lane (selectorId=${args.details.selectorId}, reason=${args.details.fallbackReason}).`,
    ),
    {
      _tag: 'ReadQueryStrictGateError' as const,
      details: args.details,
    },
  ) as ReadQueryStrictGateError

export const evaluateStrictGate = (args: {
  readonly config: ReadQueryStrictGateConfig
  readonly moduleId: string
  readonly instanceId: string
  readonly txnSeq: number
  readonly compiled: ReadQueryCompiled<any, any>
}): ReadQueryStrictGateDecision => {
  if (args.config.mode === 'off') {
    return { verdict: 'PASS' }
  }

  if (args.compiled.lane !== 'dynamic') {
    return { verdict: 'PASS' }
  }

  const fallbackReason = (args.compiled.fallbackReason ?? 'missingDeps') as ReadQueryFallbackReason

  const denyFallbackReasons = args.config.denyFallbackReasons
  const denied = !!denyFallbackReasons?.includes(fallbackReason)

  const selectorIds = filterNonEmpty(args.config.requireStatic?.selectorIds)
  const modules = filterNonEmpty(args.config.requireStatic?.modules)
  const hasCoverageFilter = !!selectorIds || !!modules

  const matchedSelectorId = !!selectorIds?.includes(args.compiled.selectorId)
  const matchedModule = !!modules?.includes(args.moduleId)
  const coveredByRequireStatic = !hasCoverageFilter || matchedSelectorId || matchedModule

  if (!denied && !coveredByRequireStatic) {
    return { verdict: 'PASS' }
  }

  const rule: ReadQueryStrictGateViolationDetails['rule'] = denied
    ? 'denyFallbackReason'
    : !hasCoverageFilter
      ? 'requireStatic:global'
      : matchedSelectorId
        ? 'requireStatic:selectorId'
        : 'requireStatic:module'

  const details: ReadQueryStrictGateViolationDetails = {
    moduleId: args.moduleId,
    instanceId: args.instanceId,
    txnSeq: args.txnSeq,
    selectorId: args.compiled.selectorId,
    debugKey: args.compiled.debugKey,
    fallbackReason,
    rule,
  }

  const diagnostic = makeStrictGateDiagnostic({ config: args.config, details })

  if (args.config.mode === 'warn') {
    return { verdict: 'WARN', diagnostic, details }
  }

  const error = makeStrictGateError({ details })
  return { verdict: 'FAIL', diagnostic, error, details }
}
