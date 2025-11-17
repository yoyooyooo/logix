import { Effect, FiberRef, Option } from 'effect'
import * as SchemaAST from 'effect/SchemaAST'
import * as Debug from '../runtime/core/DebugSink.js'
import { isDevEnv } from '../runtime/core/env.js'
import { RunSessionTag } from '../observability/runSession.js'
import { normalizeFieldPath } from '../field-path.js'
import * as DepsTrace from './deps-trace.js'
import type { ConvergeContext } from './converge.types.js'
import type { StateTraitProgram, StateTraitSchemaPathRef } from './model.js'

const onceKeysFallback = new Set<string>()

export const onceInRunSession = (key: string): Effect.Effect<boolean> =>
  Effect.serviceOption(RunSessionTag).pipe(
    Effect.map((maybe) => {
      if (Option.isSome(maybe)) {
        return maybe.value.local.once(key)
      }
      if (onceKeysFallback.has(key)) return false
      onceKeysFallback.add(key)
      return true
    }),
  )

const formatList = (items: ReadonlyArray<string>, limit = 10): string => {
  if (items.length === 0) return ''
  if (items.length <= limit) return items.join(', ')
  return `${items.slice(0, limit).join(', ')}, …(+${items.length - limit})`
}

export const emitDepsMismatch = (params: {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly kind: 'computed' | 'source'
  readonly fieldPath: string
  readonly diff: DepsTrace.DepsDiff
}): Effect.Effect<void> => {
  return Effect.gen(function* () {
    const key = `${params.moduleId ?? 'unknown'}::${params.instanceId ?? 'unknown'}::${params.kind}::${params.fieldPath}`
    const shouldEmit = yield* onceInRunSession(`deps_mismatch:${key}`)
    if (!shouldEmit) return

    yield* Debug.record({
      type: 'diagnostic',
      moduleId: params.moduleId,
      instanceId: params.instanceId,
      code: 'state_trait::deps_mismatch',
      severity: 'warning',
      message:
        `[deps] ${params.kind} "${params.fieldPath}" declared=[${formatList(params.diff.declared)}] ` +
        `reads=[${formatList(params.diff.reads)}] missing=[${formatList(params.diff.missing)}] ` +
        `unused=[${formatList(params.diff.unused)}]`,
      hint:
        'deps is the single source of truth for dependencies: incremental scheduling / reverse closures / performance optimizations rely on deps only. ' +
        'Keep deps consistent with actual reads; if you really depend on the whole object, declare a coarser-grained dep (e.g. "profile") to cover sub-field reads.',
      kind: `deps_mismatch:${params.kind}`,
    })
  })
}

const schemaHasPath = (
  ast: SchemaAST.AST,
  segments: ReadonlyArray<string>,
  seen: Set<SchemaAST.AST> = new Set(),
): boolean => {
  if (segments.length === 0) return true

  let current = ast

  // unwrap Suspend/Refinement (common for recursive schemas and branded schemas)
  while (true) {
    if (SchemaAST.isSuspend(current)) {
      if (seen.has(current)) {
        // Recursion: if we can't statically decide further, allow conservatively to avoid false positives.
        return true
      }
      seen.add(current)
      current = current.f()
      continue
    }
    if (SchemaAST.isRefinement(current)) {
      current = current.from
      continue
    }
    break
  }

  // Transformation: prefer `to` (decoded shape), but also allow `from` to reduce false positives.
  if (SchemaAST.isTransformation(current)) {
    return schemaHasPath(current.to, segments, seen) || schemaHasPath(current.from, segments, seen)
  }

  if (SchemaAST.isUnion(current)) {
    return current.types.some((t) => schemaHasPath(t, segments, seen))
  }

  if (SchemaAST.isTupleType(current)) {
    const candidates: Array<SchemaAST.AST> = []
    for (const e of current.elements) candidates.push(e.type)
    for (const r of current.rest) candidates.push(r.type)
    if (candidates.length === 0) return true
    return candidates.some((t) => schemaHasPath(t, segments, seen))
  }

  if (SchemaAST.isTypeLiteral(current)) {
    const [head, ...tail] = segments

    for (const ps of current.propertySignatures) {
      if (String(ps.name) !== head) continue
      return schemaHasPath(ps.type, tail, seen)
    }

    // index signature: open objects like Record<string, T> allow any key
    for (const sig of current.indexSignatures) {
      let param: SchemaAST.AST = sig.parameter as unknown as SchemaAST.AST
      while (SchemaAST.isRefinement(param)) {
        param = param.from
      }
      const tag = (param as any)?._tag
      if (tag === 'StringKeyword' || tag === 'TemplateLiteral') {
        return schemaHasPath(sig.type, tail, seen)
      }
    }

    return false
  }

  const tag = (current as any)?._tag
  if (tag === 'AnyKeyword' || tag === 'UnknownKeyword' || tag === 'ObjectKeyword' || tag === 'Declaration') {
    return true
  }

  return false
}

const schemaHasFieldPath = (stateSchemaAst: SchemaAST.AST, path: string): boolean => {
  if (!path) return true
  if (path === '$root') return true

  const normalized = normalizeFieldPath(path)
  if (!normalized) return false

  const segs = normalized[0] === '$root' ? normalized.slice(1) : normalized
  return schemaHasPath(stateSchemaAst, segs)
}

const formatSchemaMismatchLine = (ref: StateTraitSchemaPathRef): string => {
  if (ref.kind === 'fieldPath') {
    return `- ${ref.entryKind} "${ref.entryFieldPath}" fieldPath="${ref.path}"`
  }
  if (ref.kind === 'dep') {
    const rule = ref.ruleName ? ` rule="${ref.ruleName}"` : ''
    return `- ${ref.entryKind} "${ref.entryFieldPath}" deps="${ref.path}"${rule}`
  }
  if (ref.kind === 'link_from') {
    return `- link "${ref.entryFieldPath}" from="${ref.path}"`
  }
  if (ref.kind === 'check_writeback') {
    return `- check "${ref.entryFieldPath}" writeback="${ref.path}"`
  }
  return `- ${ref.entryKind} "${ref.entryFieldPath}" path="${ref.path}"`
}

export const emitSchemaMismatch = <S extends object>(
  program: StateTraitProgram<S>,
  ctx: Pick<ConvergeContext<S>, 'moduleId' | 'instanceId'>,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    if (!isDevEnv()) return

    const level = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
    if (level === 'off') return

    const key = `${ctx.moduleId ?? 'unknown'}::${ctx.instanceId}`
    const shouldEmit = yield* onceInRunSession(`schema_mismatch:${key}`)
    if (!shouldEmit) return

    const refs = (program.schemaPaths ?? []) as ReadonlyArray<StateTraitSchemaPathRef>
    if (refs.length === 0) return

    const stateSchemaAst = program.stateSchema.ast as unknown as SchemaAST.AST

    const mismatches: Array<StateTraitSchemaPathRef> = []
    const seen = new Set<string>()

    for (const ref of refs) {
      if (schemaHasFieldPath(stateSchemaAst, ref.path)) continue
      const k = `${ref.kind}|${ref.entryKind}|${ref.entryFieldPath}|${ref.ruleName ?? ''}|${ref.path}`
      if (seen.has(k)) continue
      seen.add(k)
      mismatches.push(ref)
    }

    if (mismatches.length === 0) return

    const limit = level === 'light' ? 8 : 24
    const lines = mismatches.slice(0, limit).map(formatSchemaMismatchLine)
    if (mismatches.length > limit) {
      lines.push(`- …(+${mismatches.length - limit})`)
    }

    yield* Debug.record({
      type: 'diagnostic',
      moduleId: ctx.moduleId,
      instanceId: ctx.instanceId,
      code: 'state_trait::schema_mismatch',
      severity: 'warning',
      message: `[schema] The following paths are not declared in stateSchema (total ${mismatches.length}):\n${lines.join('\n')}`,
      hint: 'StateTrait writeback will create missing objects/fields. Declare all fieldPath/deps/link.from and errors.* writeback paths in stateSchema, or fix typos in trait paths.',
      kind: 'schema_mismatch',
    })
  })
