import fs from 'node:fs/promises'
import path from 'node:path'

import { Effect } from 'effect'

import { fileDigestOfText } from './internal/rewriter/fileDigest.js'
import { evaluateAddObjectProperty } from './internal/rewriter/applyAddObjectProperty.js'
import { opKeyOf } from './internal/rewriter/opKey.js'
import { ReasonCodes } from './internal/rewriter/reasonCodes.js'
import type {
  PatchOperationInput,
  PatchOperationV1,
  PatchPlanV1,
  RewriterMode,
  WriteBackResultV1,
} from './internal/rewriter/model.js'

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

const sortOps = (ops: ReadonlyArray<PatchOperationInput>): ReadonlyArray<PatchOperationInput> =>
  Array.from(ops).sort((a, b) => {
    const c = compare(a.file, b.file)
    if (c !== 0) return c
    if (a.targetSpan.start.offset !== b.targetSpan.start.offset) return a.targetSpan.start.offset - b.targetSpan.start.offset
    if (a.targetSpan.end.offset !== b.targetSpan.end.offset) return a.targetSpan.end.offset - b.targetSpan.end.offset
    return compare(a.property.name, b.property.name)
  })

const normalizeReasonCodes = (codes: ReadonlyArray<string> | undefined): ReadonlyArray<string> =>
  Array.from(new Set((codes ?? []).filter((c) => typeof c === 'string' && c.length > 0))).sort()

export const buildPatchPlan = (args: {
  readonly repoRoot: string
  readonly mode: RewriterMode
  readonly operations: ReadonlyArray<PatchOperationInput>
}): Effect.Effect<PatchPlanV1, unknown> =>
  Effect.gen(function* () {
    const opsSorted = sortOps(args.operations)
    const opsOut: PatchOperationV1[] = []

    const fileCache = new Map<string, { readonly absPath: string; readonly text: string; readonly digest: string }>()

    const readFileCached = (file: string): Effect.Effect<{ readonly absPath: string; readonly text: string; readonly digest: string }, unknown> =>
      Effect.suspend(() => {
        const cached = fileCache.get(file)
        if (cached) return Effect.succeed(cached)
        const absPath = path.join(args.repoRoot, file)
        return Effect.tryPromise({
          try: async () => {
            const text = await fs.readFile(absPath, 'utf8')
            const digest = fileDigestOfText(text)
            const entry = { absPath, text, digest } as const
            fileCache.set(file, entry)
            return entry
          },
          catch: (cause) => cause,
        })
      })

    for (const op of opsSorted) {
      const baseReasonCodes = normalizeReasonCodes(op.reasonCodes)
      const opKey = opKeyOf({ kind: op.kind, file: op.file, targetSpan: op.targetSpan, property: op.property })

      if (op.kind !== 'AddObjectProperty') {
        opsOut.push({
          opKey,
          file: op.file,
          kind: op.kind,
          targetSpan: op.targetSpan,
          property: op.property,
          decision: 'fail',
          reasonCodes: [...baseReasonCodes, ReasonCodes.applyFailed, ReasonCodes.plannedFail],
        })
        continue
      }

      const fileResult = yield* Effect.either(readFileCached(op.file))
      if (fileResult._tag === 'Left') {
        opsOut.push({
          opKey,
          file: op.file,
          kind: op.kind,
          targetSpan: op.targetSpan,
          property: op.property,
          decision: 'fail',
          reasonCodes: [...baseReasonCodes, ReasonCodes.fileNotFound, ReasonCodes.plannedFail],
        })
        continue
      }

      const fileMeta = fileResult.right

      const evalResult = evaluateAddObjectProperty({
        repoFileAbs: fileMeta.absPath,
        fileText: fileMeta.text,
        targetSpan: op.targetSpan,
        property: op.property,
        reasonCodes: baseReasonCodes,
      })

      const planned =
        evalResult.decision === 'write'
          ? ReasonCodes.plannedWrite
          : evalResult.decision === 'skip'
            ? ReasonCodes.plannedSkip
            : ReasonCodes.plannedFail

      opsOut.push({
        opKey,
        file: op.file,
        kind: op.kind,
        targetSpan: op.targetSpan,
        property: op.property,
        expectedFileDigest: fileMeta.digest,
        decision: evalResult.decision,
        reasonCodes: [...new Set([...evalResult.reasonCodes, planned])],
      })
    }

    const summary = {
      operationsTotal: opsOut.length,
      writableTotal: opsOut.filter((o) => o.decision === 'write').length,
      skippedTotal: opsOut.filter((o) => o.decision === 'skip').length,
      failedTotal: opsOut.filter((o) => o.decision === 'fail').length,
    }

    return {
      schemaVersion: 1,
      kind: 'PatchPlan',
      mode: args.mode,
      operations: opsOut,
      summary,
    } as const
  })

export const applyPatchPlan = (args: {
  readonly repoRoot: string
  readonly plan: PatchPlanV1
}): Effect.Effect<WriteBackResultV1, unknown> =>
  Effect.gen(function* () {
    const skipped: Array<{ readonly opKey: string; readonly reasonCodes: ReadonlyArray<string> }> = []
    const failed: Array<{ readonly opKey: string; readonly reasonCodes: ReadonlyArray<string> }> = []
    const modifiedFiles: Array<{ readonly file: string; readonly changeKind: 'updated' | 'created' }> = []

    const byFile = new Map<string, PatchOperationV1[]>()

    for (const op of args.plan.operations) {
      if (op.decision === 'skip') {
        skipped.push({ opKey: op.opKey, reasonCodes: op.reasonCodes })
        continue
      }
      if (op.decision === 'fail') {
        failed.push({ opKey: op.opKey, reasonCodes: op.reasonCodes })
        continue
      }
      const list = byFile.get(op.file)
      if (list) list.push(op)
      else byFile.set(op.file, [op])
    }

    for (const [file, ops] of byFile) {
      const expectedDigest = ops[0]?.expectedFileDigest
      if (!expectedDigest) {
        for (const op of ops) {
          failed.push({ opKey: op.opKey, reasonCodes: [...new Set([...op.reasonCodes, ReasonCodes.expectedDigestMissing])] })
        }
        continue
      }

      const absPath = path.join(args.repoRoot, file)
      const readResult = yield* Effect.either(
        Effect.tryPromise({
          try: async () => await fs.readFile(absPath, 'utf8'),
          catch: (cause) => cause,
        }),
      )

      if (readResult._tag === 'Left') {
        for (const op of ops) {
          failed.push({ opKey: op.opKey, reasonCodes: [...new Set([...op.reasonCodes, ReasonCodes.fileNotFound])] })
        }
        continue
      }

      const originalText = readResult.right
      const digestNow = fileDigestOfText(originalText)

      if (digestNow !== expectedDigest) {
        for (const op of ops) {
          failed.push({ opKey: op.opKey, reasonCodes: [...new Set([...op.reasonCodes, ReasonCodes.fileChangedSincePlan])] })
        }
        continue
      }

      if (args.plan.mode !== 'write') {
        for (const op of ops) {
          skipped.push({ opKey: op.opKey, reasonCodes: [...new Set([...op.reasonCodes, ReasonCodes.plannedSkip])] })
        }
        continue
      }

      const sorted = Array.from(ops).sort((a, b) => b.targetSpan.start.offset - a.targetSpan.start.offset)

      let nextText = originalText
      const written: PatchOperationV1[] = []
      let fileFailed = false

      for (const op of sorted) {
        const evalResult = evaluateAddObjectProperty({
          repoFileAbs: absPath,
          fileText: nextText,
          targetSpan: op.targetSpan,
          property: op.property,
          reasonCodes: op.reasonCodes,
        })

        if (evalResult.decision === 'skip') {
          skipped.push({ opKey: op.opKey, reasonCodes: evalResult.reasonCodes })
        } else if (evalResult.decision === 'fail') {
          failed.push({ opKey: op.opKey, reasonCodes: evalResult.reasonCodes })
          fileFailed = true
        } else {
          nextText = evalResult.updatedText
          written.push(op)
        }
      }

      if (fileFailed) {
        for (const op of written) {
          failed.push({ opKey: op.opKey, reasonCodes: [...new Set([...op.reasonCodes, ReasonCodes.applyFailed])] })
        }
        continue
      }

      if (nextText !== originalText) {
        yield* Effect.tryPromise({
          try: async () => {
            await fs.writeFile(absPath, nextText, 'utf8')
          },
          catch: (cause) => cause,
        })
        modifiedFiles.push({ file, changeKind: 'updated' })
      }
    }

    modifiedFiles.sort((a, b) => compare(a.file, b.file))
    skipped.sort((a, b) => compare(a.opKey, b.opKey))
    failed.sort((a, b) => compare(a.opKey, b.opKey))

    return {
      schemaVersion: 1,
      kind: 'WriteBackResult',
      mode: args.plan.mode,
      modifiedFiles,
      skipped,
      failed,
    } as const
  })
