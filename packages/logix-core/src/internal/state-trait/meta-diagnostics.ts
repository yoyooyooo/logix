import { Effect, FiberRef } from 'effect'
import * as Debug from '../runtime/core/DebugSink.js'
import { isDevEnv } from '../runtime/core/env.js'
import { onceInRunSession } from './converge-diagnostics.js'
import type { StateTraitProgram } from './model.js'
import * as Meta from './meta.js'

type MetaIssue = Readonly<{
  readonly origin: string
  readonly report: Meta.TraitMetaSanitizeReport
}>

const formatList = (items: ReadonlyArray<string> | undefined, limit = 6): string | undefined => {
  if (!items || items.length === 0) return undefined
  if (items.length <= limit) return items.join(', ')
  return `${items.slice(0, limit).join(', ')}, …(+${items.length - limit})`
}

const formatPart = (label: string, value: string | number | undefined): string | undefined => {
  if (value === undefined) return undefined
  return `${label}=${value}`
}

const formatIssue = (issue: MetaIssue): string => {
  const r = issue.report

  const parts: Array<string> = []

  if (r.invalidInput) parts.push('invalidInput=true')

  const unknownKeys = formatList(r.unknownKeys, 6)
  if (unknownKeys) {
    parts.push(
      `unknownKeys=[${unknownKeys}]${typeof r.unknownKeyCount === 'number' && r.unknownKeyCount > r.unknownKeys!.length ? ` total=${r.unknownKeyCount}` : ''}`,
    )
  }

  const droppedKeys = formatList(r.droppedKeys, 6)
  if (droppedKeys) parts.push(`droppedKeys=[${droppedKeys}]`)

  if (typeof r.droppedTagItems === 'number' && r.droppedTagItems > 0) {
    parts.push(`droppedTagItems=${r.droppedTagItems}`)
  }

  const ignoredAnnotationKeys = formatList(r.ignoredAnnotationKeys, 6)
  if (ignoredAnnotationKeys) {
    parts.push(
      `ignoredAnnotationKeys=[${ignoredAnnotationKeys}]${
        typeof r.ignoredAnnotationKeyCount === 'number' && r.ignoredAnnotationKeyCount > r.ignoredAnnotationKeys!.length
          ? ` total=${r.ignoredAnnotationKeyCount}`
          : ''
      }`,
    )
  }

  const droppedAnnotationKeys = formatList(r.droppedAnnotationKeys, 6)
  if (droppedAnnotationKeys) {
    parts.push(
      `droppedAnnotationKeys=[${droppedAnnotationKeys}]${
        typeof r.droppedAnnotationKeyCount === 'number' && r.droppedAnnotationKeyCount > r.droppedAnnotationKeys!.length
          ? ` total=${r.droppedAnnotationKeyCount}`
          : ''
      }`,
    )
  }

  const droppedValues = formatPart('droppedAnnotationValues', r.droppedAnnotationValues)
  if (droppedValues) parts.push(droppedValues)

  const nonSerializable = formatPart('nonSerializable', r.droppedAnnotationNonSerializable)
  const depthExceeded = formatPart('depthExceeded', r.droppedAnnotationDepthExceeded)
  const nonFiniteNumber = formatPart('nonFiniteNumber', r.droppedAnnotationNonFiniteNumber)
  const reasons = [nonSerializable, depthExceeded, nonFiniteNumber].filter((x): x is string => x !== undefined)
  if (reasons.length > 0) parts.push(`reasons={${reasons.join(', ')}}`)

  return `[${issue.origin}] ${parts.join(' ')}`
}

const collectNodeMetaIssues = (program: StateTraitProgram<any>): Array<MetaIssue> => {
  const spec: any = program.spec as any
  if (!spec || typeof spec !== 'object') return []

  const isNode = (value: unknown): value is { readonly _tag: 'StateTraitNode'; readonly meta?: unknown } =>
    typeof value === 'object' && value !== null && (value as any)._tag === 'StateTraitNode'

  const isList = (value: unknown): value is { readonly _tag: 'StateTraitList'; readonly item?: unknown; readonly list?: unknown } =>
    typeof value === 'object' && value !== null && (value as any)._tag === 'StateTraitList'

  const issues: Array<MetaIssue> = []

  const add = (origin: string, meta: unknown): void => {
    const { report } = Meta.sanitizeWithReport(meta)
    if (report) issues.push({ origin, report })
  }

  for (const key of Object.keys(spec)) {
    const raw = spec[key]
    if (!raw) continue

    if (isList(raw)) {
      if (raw.item && isNode(raw.item) && (raw.item as any).meta !== undefined) {
        add(`node:${key}[]`, (raw.item as any).meta)
      }
      if (raw.list && isNode(raw.list) && (raw.list as any).meta !== undefined) {
        add(`node:${key}`, (raw.list as any).meta)
      }
      continue
    }

    if (isNode(raw)) {
      if ((raw as any).meta === undefined) continue
      add(`node:${key === '$root' ? '$root' : key}`, (raw as any).meta)
      continue
    }
  }

  return issues
}

const collectEntryMetaIssues = (program: StateTraitProgram<any>): Array<MetaIssue> => {
  const issues: Array<MetaIssue> = []

  for (const entry of program.entries) {
    if (entry.kind !== 'source' && entry.kind !== 'externalStore') continue
    const rawMeta = (entry.meta as any)?.meta
    if (rawMeta === undefined) continue

    const origin = entry.kind === 'source' ? `source:${entry.fieldPath}` : `externalStore:${entry.fieldPath}`
    const { report } = Meta.sanitizeWithReport(rawMeta)
    if (report) issues.push({ origin, report })
  }

  return issues
}

export const emitMetaSanitizeDiagnostics = (
  program: StateTraitProgram<any>,
  ctx: Readonly<{ readonly moduleId?: string; readonly instanceId?: string }>,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    if (!isDevEnv()) return

    const level = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
    if (level === 'off') return

    const moduleId = ctx.moduleId ?? 'unknown'
    const shouldEmit = yield* onceInRunSession(`meta_sanitize:${moduleId}`)
    if (!shouldEmit) return

    const issues = [...collectNodeMetaIssues(program), ...collectEntryMetaIssues(program)]
    if (issues.length === 0) return

    const limit = level === 'light' || level === 'sampled' ? 8 : 24
    const lines = issues.slice(0, limit).map(formatIssue)
    if (issues.length > limit) {
      lines.push(`…(+${issues.length - limit})`)
    }

    yield* Debug.record({
      type: 'diagnostic',
      moduleId: ctx.moduleId,
      instanceId: ctx.instanceId,
      code: 'state_trait::meta_sanitized',
      severity: 'warning',
      message: `[meta] TraitMeta contains non-exportable fields/values and will be sanitized (total ${issues.length}):\n${lines.join('\n')}`,
      hint:
        'TraitMeta is export-only (Devtools/Static IR) and MUST be JsonValue. ' +
        'Use `annotations` with `x-*` keys for extension hints; avoid closures/functions/Effect/Fiber/Tag/DOM/BigInt/circular refs. ' +
        'See specs/016 and docs/ssot/platform/contracts/03-control-surface-manifest.md.',
      kind: 'meta_sanitized',
    })
  })

