import fs from 'node:fs/promises'
import path from 'node:path'

import { Effect } from 'effect'
import { Node, Project, SyntaxKind, type CallExpression, type ObjectLiteralExpression } from 'ts-morph'

import type { WorkflowStepKeyTarget } from './collectWorkflowStepTargets.js'
import type { JsonValue, SkipReason } from './model.js'
import { makeSkipReason } from './policy.js'
import { spanOfNode } from '../span.js'

type StepKind = 'dispatch' | 'delay' | 'callById'

type MissingStepResolved = {
  readonly target: WorkflowStepKeyTarget
  readonly stepKind: StepKind
  readonly baseKey: string
  readonly argsSpanStartOffset: number
}

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

const isWorkflowDefCall = (call: CallExpression): boolean => {
  const expr = call.getExpression()
  if (!Node.isPropertyAccessExpression(expr)) return false
  const name = expr.getName()
  if (name !== 'make' && name !== 'fromJSON') return false
  const left = expr.getExpression()
  if (Node.isIdentifier(left)) return left.getText() === 'Workflow'
  if (!Node.isPropertyAccessExpression(left)) return false
  if (left.getName() !== 'Workflow') return false
  const root = left.getExpression()
  return Node.isIdentifier(root) && root.getText() === 'Logix'
}

const findLocalIdLiteral = (def: ObjectLiteralExpression): string | undefined => {
  for (const prop of def.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue
    const nameNode = prop.getNameNode()
    const name = nameNode.getText().replace(/['"`]/g, '')
    if (name !== 'localId') continue
    const init = prop.getInitializer()
    if (!init) continue
    if (Node.isStringLiteral(init)) return init.getLiteralValue()
    if (Node.isNoSubstitutionTemplateLiteral(init)) return init.getLiteralText()
  }
  return undefined
}

const isWorkflowStepBuilderCall = (call: CallExpression): StepKind | undefined => {
  const expr = call.getExpression()
  if (!Node.isPropertyAccessExpression(expr)) return undefined
  const name = expr.getName()
  if (name !== 'dispatch' && name !== 'delay' && name !== 'callById') return undefined
  const left = expr.getExpression()
  if (Node.isIdentifier(left)) return left.getText() === 'Workflow' ? name : undefined
  if (!Node.isPropertyAccessExpression(left)) return undefined
  if (left.getName() !== 'Workflow') return undefined
  const root = left.getExpression()
  return Node.isIdentifier(root) && root.getText() === 'Logix' ? name : undefined
}

const findObjectLiteralArg0 = (call: CallExpression): ObjectLiteralExpression | undefined => {
  const [first] = call.getArguments()
  return first && Node.isObjectLiteralExpression(first) ? first : undefined
}

const findStringLiteralProp = (obj: ObjectLiteralExpression, name: string): string | undefined => {
  for (const prop of obj.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue
    const propName = prop.getNameNode().getText().replace(/['"`]/g, '')
    if (propName !== name) continue
    const init = prop.getInitializer()
    if (!init) return undefined
    if (Node.isStringLiteral(init)) return init.getLiteralValue()
    if (Node.isNoSubstitutionTemplateLiteral(init)) return init.getLiteralText()
    return undefined
  }
  return undefined
}

const findNumberLiteralProp = (obj: ObjectLiteralExpression, name: string): number | undefined => {
  for (const prop of obj.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue
    const propName = prop.getNameNode().getText().replace(/['"`]/g, '')
    if (propName !== name) continue
    const init = prop.getInitializer()
    if (!init) return undefined
    if (Node.isNumericLiteral(init)) return Number(init.getText())
    return undefined
  }
  return undefined
}

const findKeyLiteral = (obj: ObjectLiteralExpression): string | undefined => findStringLiteralProp(obj, 'key')

const findWorkflowCallByLocalId = (sfCalls: ReadonlyArray<CallExpression>, workflowLocalId: string): CallExpression | undefined => {
  const candidates: CallExpression[] = []
  for (const call of sfCalls) {
    if (!isWorkflowDefCall(call)) continue
    const [defArg] = call.getArguments()
    if (!defArg || !Node.isObjectLiteralExpression(defArg)) continue
    const id = findLocalIdLiteral(defArg)
    if (id === workflowLocalId) candidates.push(call)
  }
  return candidates.length === 1 ? candidates[0] : undefined
}

const computeStepKeyBase = (stepKind: StepKind, argsObj: ObjectLiteralExpression): string | undefined => {
  if (stepKind === 'dispatch') {
    const actionTag = findStringLiteralProp(argsObj, 'actionTag')
    return actionTag ? `dispatch.${actionTag}` : undefined
  }
  if (stepKind === 'callById') {
    const serviceId = findStringLiteralProp(argsObj, 'serviceId')
    return serviceId ? `call.${serviceId}` : undefined
  }
  const ms = findNumberLiteralProp(argsObj, 'ms')
  return typeof ms === 'number' && Number.isFinite(ms) ? `delay.${ms}ms` : undefined
}

export const buildWorkflowStepKeyPatches = (args: {
  readonly repoRoot: string
  readonly targets: ReadonlyArray<WorkflowStepKeyTarget>
}): Effect.Effect<
  | {
      readonly ok: true
      readonly operations: ReadonlyArray<{
        readonly file: string
        readonly workflowTargetId: string
        readonly insertSpan: WorkflowStepKeyTarget['insertSpan']
        readonly valueCode: string
        readonly changes: JsonValue
      }>
      readonly changesByWorkflow: ReadonlyArray<{ readonly workflowTargetId: string; readonly changes: JsonValue }>
    }
  | { readonly ok: false; readonly failures: ReadonlyArray<{ readonly workflowTargetId: string; readonly file: string; readonly reason: SkipReason }> },
  unknown
> =>
  Effect.gen(function* () {
  const byWorkflow = new Map<string, WorkflowStepKeyTarget[]>()
  for (const t of args.targets) {
    const list = byWorkflow.get(t.workflowLocalId)
    if (list) list.push(t)
    else byWorkflow.set(t.workflowLocalId, [t])
  }

  const failures: Array<{ readonly workflowTargetId: string; readonly file: string; readonly reason: SkipReason }> = []
  const ops: Array<{
    readonly file: string
    readonly workflowTargetId: string
    readonly insertSpan: WorkflowStepKeyTarget['insertSpan']
    readonly valueCode: string
    readonly changes: JsonValue
  }> = []
  const changesByWorkflow: Array<{ readonly workflowTargetId: string; readonly changes: JsonValue }> = []

  for (const [workflowLocalId, targets] of byWorkflow) {
    const workflowTargetId = `workflow:${workflowLocalId}`
    const files = Array.from(new Set(targets.map((t) => t.file))).sort(compare)
    if (files.length !== 1) {
      failures.push({
        workflowTargetId,
        file: files[0] ?? targets[0]!.file,
        reason: makeSkipReason('unsupported_shape', { details: { files } }),
      })
      continue
    }

    const file = files[0]!
    const fileAbs = path.join(args.repoRoot, file)
    const fileText = yield* Effect.tryPromise({
      try: () => fs.readFile(fileAbs, 'utf8'),
      catch: (cause) => cause,
    })

    const project = new Project({ useInMemoryFileSystem: true })
    const sf = project.createSourceFile(fileAbs, fileText, { overwrite: true })
    const calls = sf.getDescendantsOfKind(SyntaxKind.CallExpression)

    const workflowCall = findWorkflowCallByLocalId(calls, workflowLocalId)
    if (!workflowCall) {
      failures.push({
        workflowTargetId,
        file,
        reason: makeSkipReason('unsupported_shape', { details: { file, workflowLocalId } }),
      })
      continue
    }

    const stepCalls = workflowCall.getDescendantsOfKind(SyntaxKind.CallExpression)
    const argsByStart = new Map<number, { readonly call: CallExpression; readonly kind: StepKind; readonly argsObj: ObjectLiteralExpression }>()

    const existingKeys = new Map<string, number>()
    const duplicateKeys = new Set<string>()

    for (const call of stepCalls) {
      const kind = isWorkflowStepBuilderCall(call)
      if (!kind) continue
      const argsObj = findObjectLiteralArg0(call)
      if (!argsObj) continue
      argsByStart.set(argsObj.getStart(), { call, kind, argsObj })

      const key = findKeyLiteral(argsObj)
      if (!key) continue
      const prev = existingKeys.get(key) ?? 0
      existingKeys.set(key, prev + 1)
      if (prev >= 1) duplicateKeys.add(key)
    }

    if (duplicateKeys.size > 0) {
      failures.push({
        workflowTargetId,
        file,
        reason: makeSkipReason('duplicate_step_key', {
          details: { duplicateKeys: Array.from(duplicateKeys).sort(compare) },
        }),
      })
      continue
    }

    const missingResolved: MissingStepResolved[] = []
    for (const t of targets) {
      const step = argsByStart.get(t.argsObjectStartOffset)
      if (!step) {
        failures.push({
          workflowTargetId,
          file,
          reason: makeSkipReason('unsupported_shape', {
            details: { file, missingArgsObjectStartOffset: t.argsObjectStartOffset },
          }),
        })
        continue
      }
      const baseKey = computeStepKeyBase(step.kind, step.argsObj)
      if (!baseKey) {
        failures.push({
          workflowTargetId,
          file,
          reason: makeSkipReason('unresolvable_step_key', {
            details: { file, stepKind: step.kind, argsSpan: spanOfNode(step.argsObj) },
          }),
        })
        continue
      }
      missingResolved.push({
        target: t,
        stepKind: step.kind,
        baseKey,
        argsSpanStartOffset: t.argsObjectStartOffset,
      })
    }

    if (failures.some((f) => f.workflowTargetId === workflowTargetId)) continue

    const usedKeys = new Set(Array.from(existingKeys.keys()))
    const resolvedWrites = missingResolved
      .slice()
      .sort((a, b) => a.argsSpanStartOffset - b.argsSpanStartOffset)
      .map((m) => {
        const base = m.baseKey
        if (!usedKeys.has(base)) {
          usedKeys.add(base)
          return { ...m, finalKey: base }
        }
        let n = 2
        while (usedKeys.has(`${base}.${n}`)) n += 1
        const final = `${base}.${n}`
        usedKeys.add(final)
        return { ...m, finalKey: final }
      })

    changesByWorkflow.push({
      workflowTargetId,
      changes: {
        workflowLocalId,
        inserted: resolvedWrites.map((w) => ({
          key: w.finalKey,
          stepKind: w.stepKind,
          argsObjectStartOffset: w.argsSpanStartOffset,
        })),
      },
    })

    for (const w of resolvedWrites) {
      ops.push({
        file,
        workflowTargetId,
        insertSpan: w.target.insertSpan,
        valueCode: JSON.stringify(w.finalKey),
        changes: {
          workflowLocalId,
          key: w.finalKey,
          stepKind: w.stepKind,
          argsObjectStartOffset: w.argsSpanStartOffset,
        },
      })
    }
  }

  return failures.length > 0 ? { ok: false, failures } : { ok: true, operations: ops, changesByWorkflow }
  })
