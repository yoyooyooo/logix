import { Effect } from 'effect'

import type { AnchorIndexV1 } from './Parser.js'
import { applyPatchPlan, buildPatchPlan } from './Rewriter.js'
import type { AutofillMode, Decision, JsonValue, SkipReason } from './internal/autofill/model.js'
import { buildDevSourcePatch } from './internal/autofill/buildDevSourcePatch.js'
import { buildServicesPatch } from './internal/autofill/buildServicesPatch.js'
import { buildWorkflowStepKeyPatches } from './internal/autofill/buildWorkflowStepKeyPatch.js'
import { collectServiceUses } from './internal/autofill/collectServiceUses.js'
import { collectWorkflowStepTargets } from './internal/autofill/collectWorkflowStepTargets.js'
import { makeSkipReason, parseMetaReasonCodes } from './internal/autofill/policy.js'
import { buildAutofillReport, groupDecisionsByFileAndTarget } from './internal/autofill/report.js'
import { addObjectPropertyOp } from './internal/autofill/toPatchOperations.js'
import { ReasonCodes as RewriterReasonCodes } from './internal/rewriter/reasonCodes.js'
import type { PatchOperationInput, PatchPlanV1, WriteBackResultV1 } from './internal/rewriter/model.js'

type DecisionRow = { readonly file: string; readonly targetId: string; readonly decision: Decision }

const keyOf = (args: { readonly file: string; readonly targetId: string; readonly anchorKind: string }): string =>
  `${args.file}::${args.targetId}::${args.anchorKind}`

const decisionSkipped = (kind: string, reason: SkipReason): Decision => ({ kind, status: 'skipped', reason })

const decisionWritten = (kind: string, changes: JsonValue): Decision => ({ kind, status: 'written', changes })

const skipReasonFromRewriter = (reasonCodes: ReadonlyArray<string>): SkipReason => {
  if (reasonCodes.includes(RewriterReasonCodes.propertyAlreadyDeclared)) return makeSkipReason('already_declared')
  return makeSkipReason('unsafe_to_patch', { details: { rewriterReasonCodes: reasonCodes } })
}

export type AutofillOutcome = {
  readonly report: ReturnType<typeof buildAutofillReport>
  readonly patchPlan: PatchPlanV1
  readonly writeBackResult?: WriteBackResultV1
}

export const autofillAnchors = (args: {
  readonly repoRoot: string
  readonly mode: AutofillMode
  readonly runId: string
  readonly anchorIndex: AnchorIndexV1
}): Effect.Effect<AutofillOutcome, unknown> =>
  Effect.gen(function* () {
    const uses = collectServiceUses(args.anchorIndex.entries)

    const plannedOps: PatchOperationInput[] = []
    const policyDecisions: DecisionRow[] = []

    const plannedChanges = new Map<string, JsonValue>()

    for (const entry of args.anchorIndex.entries) {
      if (entry.kind !== 'AutofillTarget') continue

      if (entry.target.kind === 'module') {
        const moduleId = entry.target.moduleIdLiteral
        const targetId = moduleId

        const missingServices = entry.missing.services
        if (missingServices) {
          const built = buildServicesPatch({ moduleId, uses })
          if (built.ok) {
            plannedOps.push(
              addObjectPropertyOp({
                file: entry.file,
                targetId,
                anchorKind: 'services',
                targetSpan: missingServices.insertSpan,
                propertyName: 'services',
                valueCode: built.valueCode,
              }),
            )
            plannedChanges.set(keyOf({ file: entry.file, targetId, anchorKind: 'services' }), built.changes)
          } else {
            policyDecisions.push({
              file: entry.file,
              targetId,
              decision: decisionSkipped('services', built.reason),
            })
          }
        }

        const missingDevSource = entry.missing.devSource
        if (missingDevSource) {
          const built = buildDevSourcePatch({
            target: entry as any,
            missing: missingDevSource,
          })
          if (built.ok) {
            plannedOps.push(
              addObjectPropertyOp({
                file: entry.file,
                targetId,
                anchorKind: 'dev.source',
                targetSpan: missingDevSource.insertSpan,
                propertyName: built.propertyName,
                valueCode: built.valueCode,
              }),
            )
            plannedChanges.set(keyOf({ file: entry.file, targetId, anchorKind: 'dev.source' }), built.changes)
          } else {
            policyDecisions.push({
              file: entry.file,
              targetId,
              decision: decisionSkipped('dev.source', built.reason),
            })
          }
        }
      }
    }

    const workflowTargets = collectWorkflowStepTargets(args.anchorIndex.entries)
    if (workflowTargets.length > 0) {
      const stepKey = yield* buildWorkflowStepKeyPatches({ repoRoot: args.repoRoot, targets: workflowTargets })
      if (stepKey.ok) {
        for (const c of stepKey.changesByWorkflow) {
          const wfLocalId = String((c.changes as any)?.workflowLocalId ?? c.workflowTargetId.replace(/^workflow:/, ''))
          const file = workflowTargets.find((t) => t.workflowLocalId === wfLocalId)?.file
          if (file) plannedChanges.set(keyOf({ file, targetId: c.workflowTargetId, anchorKind: 'workflow.stepKey' }), c.changes)
        }

        for (const op of stepKey.operations) {
          plannedOps.push(
            addObjectPropertyOp({
              file: op.file,
              targetId: op.workflowTargetId,
              anchorKind: 'workflow.stepKey',
              targetSpan: op.insertSpan,
              propertyName: 'key',
              valueCode: op.valueCode,
            }),
          )
        }
      } else {
        for (const f of stepKey.failures) {
          policyDecisions.push({
            file: f.file,
            targetId: f.workflowTargetId,
            decision: decisionSkipped('workflow.stepKey', f.reason),
          })
        }
      }
    }

    const patchPlan = yield* buildPatchPlan({
      repoRoot: args.repoRoot,
      mode: args.mode,
      operations: plannedOps,
    })

    const writeBackResult =
      args.mode === 'write'
        ? yield* applyPatchPlan({
            repoRoot: args.repoRoot,
            plan: patchPlan,
          })
        : undefined

    const failedOpKeys = new Set(writeBackResult?.failed.map((f) => f.opKey) ?? [])

    const decisionsFromPlan: DecisionRow[] = []
    const grouped = new Map<string, { readonly file: string; readonly targetId: string; readonly anchorKind: string; ops: Array<(typeof patchPlan.operations)[number]> }>()

    for (const op of patchPlan.operations) {
      const meta = parseMetaReasonCodes(op.reasonCodes)
      if (!meta.targetId || !meta.anchorKind) continue
      const key = keyOf({ file: op.file, targetId: meta.targetId, anchorKind: meta.anchorKind })
      const existing = grouped.get(key)
      if (existing) existing.ops.push(op)
      else grouped.set(key, { file: op.file, targetId: meta.targetId, anchorKind: meta.anchorKind, ops: [op] })
    }

    for (const group of grouped.values()) {
      const anchorKind = group.anchorKind
      const kindLabel = anchorKind

      const hasFailed = group.ops.some((op) => failedOpKeys.has(op.opKey) || op.decision === 'fail')
      if (hasFailed) {
        const allReasons = Array.from(new Set(group.ops.flatMap((o) => o.reasonCodes))).sort()
        decisionsFromPlan.push({
          file: group.file,
          targetId: group.targetId,
          decision: decisionSkipped(kindLabel, skipReasonFromRewriter(allReasons)),
        })
        continue
      }

      const hasWrite = group.ops.some((op) => op.decision === 'write')
      if (hasWrite) {
        const changes = plannedChanges.get(keyOf({ file: group.file, targetId: group.targetId, anchorKind })) ?? {
          property: group.ops.map((o) => ({ name: o.property.name, valueCode: o.property.valueCode })),
        }
        decisionsFromPlan.push({
          file: group.file,
          targetId: group.targetId,
          decision: decisionWritten(kindLabel, changes),
        })
        continue
      }

      const allReasons = Array.from(new Set(group.ops.flatMap((o) => o.reasonCodes))).sort()
      decisionsFromPlan.push({
        file: group.file,
        targetId: group.targetId,
        decision: decisionSkipped(kindLabel, skipReasonFromRewriter(allReasons)),
      })
    }

    const allDecisions = [...policyDecisions, ...decisionsFromPlan]
    const changes = groupDecisionsByFileAndTarget(allDecisions)

    const ok = args.mode === 'write' ? (writeBackResult?.failed.length ?? 0) === 0 : true

    const report = buildAutofillReport({
      mode: args.mode,
      runId: args.runId,
      ok,
      changes,
    })

    return {
      report,
      patchPlan,
      ...(writeBackResult ? { writeBackResult } : null),
    }
  })

