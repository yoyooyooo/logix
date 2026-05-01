import fs from 'node:fs/promises'
import path from 'node:path'

import { Effect } from 'effect'

import type { EvidenceInputRef, SelectionManifestRef } from './args.js'
import { makeArtifactOutput } from './artifacts.js'
import { makeCliError } from './errors.js'
import type { ArtifactOutput } from './result.js'

export interface CanonicalEvidenceInput {
  readonly ref: string
  readonly kind: 'CanonicalEvidencePackage'
  readonly packageId: string
  readonly artifactOutputKeys: ReadonlyArray<string>
}

export interface SelectionManifestInput {
  readonly ref: string
  readonly kind: 'LogixSelectionManifest'
  readonly selectionId: string
  readonly sessionId?: string
  readonly findingId?: string
  readonly artifactOutputKey?: string
  readonly focusRef?: Record<string, unknown>
  readonly authority: 'hint-only'
}

export interface EvidenceInputs {
  readonly evidence?: CanonicalEvidenceInput
  readonly selection?: SelectionManifestInput
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readJson = (filePath: string, code: 'CLI_INVALID_EVIDENCE' | 'CLI_INVALID_SELECTION'): Effect.Effect<unknown, ReturnType<typeof makeCliError>> =>
  Effect.tryPromise({
    try: async () => JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown,
    catch: (cause) =>
      makeCliError({
        code,
        message: `[Logix][CLI] 无法读取或解析输入：${filePath}`,
        cause,
      }),
  })

const resolveEvidenceManifestPath = (ref: string): Effect.Effect<string, ReturnType<typeof makeCliError>> =>
  Effect.tryPromise({
    try: async () => {
      const abs = path.resolve(ref)
      const stat = await fs.stat(abs)
      return stat.isDirectory() ? path.join(abs, 'manifest.json') : abs
    },
    catch: (cause) =>
      makeCliError({
        code: 'CLI_INVALID_EVIDENCE',
        message: `[Logix][CLI] evidence ref 不存在：${ref}`,
        cause,
      }),
  })

const readEvidence = (input: EvidenceInputRef | undefined): Effect.Effect<CanonicalEvidenceInput | undefined, ReturnType<typeof makeCliError>> => {
  if (!input) return Effect.succeed(undefined)
  return Effect.gen(function* () {
    const manifestPath = yield* resolveEvidenceManifestPath(input.ref)
    const raw = yield* readJson(manifestPath, 'CLI_INVALID_EVIDENCE')
    if (!isRecord(raw) || raw.kind !== 'CanonicalEvidencePackage') {
      return yield* Effect.fail(
        makeCliError({
          code: 'CLI_INVALID_EVIDENCE',
          message: `[Logix][CLI] evidence manifest 必须是 CanonicalEvidencePackage：${input.ref}`,
        }),
      )
    }
    const packageId = typeof raw.packageId === 'string' && raw.packageId.length > 0 ? raw.packageId : undefined
    const artifacts = Array.isArray(raw.artifacts) ? raw.artifacts : undefined
    if (!packageId || !artifacts) {
      return yield* Effect.fail(
        makeCliError({
          code: 'CLI_INVALID_EVIDENCE',
          message: `[Logix][CLI] evidence manifest 缺少 packageId 或 artifacts：${input.ref}`,
        }),
      )
    }

    const artifactOutputKeys = artifacts
      .map((artifact) => (isRecord(artifact) && typeof artifact.outputKey === 'string' ? artifact.outputKey : undefined))
      .filter((key): key is string => Boolean(key))
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

    return {
      ref: input.ref,
      kind: 'CanonicalEvidencePackage',
      packageId,
      artifactOutputKeys,
    }
  })
}

const readSelection = (
  input: SelectionManifestRef | undefined,
): Effect.Effect<SelectionManifestInput | undefined, ReturnType<typeof makeCliError>> => {
  if (!input) return Effect.succeed(undefined)
  return Effect.gen(function* () {
    const abs = path.resolve(input.ref)
    const raw = yield* readJson(abs, 'CLI_INVALID_SELECTION')
    if (!isRecord(raw) || raw.kind !== 'LogixSelectionManifest') {
      return yield* Effect.fail(
        makeCliError({
          code: 'CLI_INVALID_SELECTION',
          message: `[Logix][CLI] selection manifest 必须是 LogixSelectionManifest：${input.ref}`,
        }),
      )
    }
    const selectionId = typeof raw.selectionId === 'string' && raw.selectionId.length > 0 ? raw.selectionId : undefined
    if (!selectionId) {
      return yield* Effect.fail(
        makeCliError({
          code: 'CLI_INVALID_SELECTION',
          message: `[Logix][CLI] selection manifest 缺少 selectionId：${input.ref}`,
        }),
      )
    }

    return {
      ref: input.ref,
      kind: 'LogixSelectionManifest',
      selectionId,
      ...(typeof raw.sessionId === 'string' ? { sessionId: raw.sessionId } : null),
      ...(typeof raw.findingId === 'string' ? { findingId: raw.findingId } : null),
      ...(typeof raw.artifactOutputKey === 'string' ? { artifactOutputKey: raw.artifactOutputKey } : null),
      ...(isRecord(raw.focusRef) ? { focusRef: raw.focusRef } : null),
      authority: 'hint-only',
    }
  })
}

export const readEvidenceInputs = (input: {
  readonly evidence?: EvidenceInputRef
  readonly selection?: SelectionManifestRef
}): Effect.Effect<EvidenceInputs, ReturnType<typeof makeCliError>> =>
  Effect.gen(function* () {
    const evidence = yield* readEvidence(input.evidence)
    const selection = yield* readSelection(input.selection)
    if (evidence && selection?.artifactOutputKey && !evidence.artifactOutputKeys.includes(selection.artifactOutputKey)) {
      return yield* Effect.fail(
        makeCliError({
          code: 'CLI_INVALID_SELECTION',
          message: `[Logix][CLI] selection artifactOutputKey 不在 evidence artifacts 中：${selection.artifactOutputKey}`,
        }),
      )
    }
    return {
      ...(evidence ? { evidence } : null),
      ...(selection ? { selection } : null),
    }
  })

export const makeEvidenceInputArtifacts = (args: {
  readonly inputs: EvidenceInputs
  readonly outDir?: string
  readonly budgetBytes?: number
}): Effect.Effect<ReadonlyArray<ArtifactOutput>, unknown> =>
  Effect.gen(function* () {
    const artifacts: ArtifactOutput[] = []
    if (args.inputs.evidence) {
      artifacts.push(
        yield* makeArtifactOutput({
          outDir: args.outDir,
          budgetBytes: args.budgetBytes,
          fileName: 'evidence.input.json',
          outputKey: 'evidenceInput',
          kind: 'CanonicalEvidenceInput',
          value: args.inputs.evidence,
          schemaVersion: 1,
        }),
      )
    }
    if (args.inputs.selection) {
      artifacts.push(
        yield* makeArtifactOutput({
          outDir: args.outDir,
          budgetBytes: args.budgetBytes,
          fileName: 'selection.input.json',
          outputKey: 'selectionManifest',
          kind: 'SelectionManifestInput',
          value: args.inputs.selection,
          schemaVersion: 1,
        }),
      )
    }
    return artifacts
  })
