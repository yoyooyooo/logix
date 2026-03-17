export type RuntimeShellMode = 'snapshot' | 'noSnapshot'

export type RuntimeShellBoundaryClass =
  | 'snapshot_ready'
  | 'snapshot_blocked'
  | 'reuse_hit'
  | 'reuse_miss'
  | 'policy_fallback'
  | 'diagnostics_escalated'

export type RuntimeShellSource =
  | 'resolveShell.snapshot'
  | 'resolveShell.noSnapshot'
  | 'operationRunner.shared'
  | 'operationRunner.fallback'

export type RuntimeShellReasonCode =
  | 'snapshot_missing'
  | 'snapshot_scope_mismatch'
  | 'middleware_env_mismatch'
  | 'trait_config_mismatch'
  | 'concurrency_policy_mismatch'
  | 'diagnostics_level_escalated'

export type RuntimeShellBoundaryDecision = {
  readonly mode: RuntimeShellMode
  readonly reasonCode: RuntimeShellReasonCode
  readonly boundaryClass: RuntimeShellBoundaryClass
  readonly reuseKeyHash?: string
  readonly shellRef?: {
    readonly instanceId: string
    readonly txnSeq: number
    readonly opSeq?: number
  }
  readonly shellSource: RuntimeShellSource
}

export type RuntimeShellBoundaryAttribution = {
  readonly reasonShare: Readonly<Record<string, number>>
  readonly boundaryClassShare: Readonly<Record<string, number>>
  readonly noSnapshotTopReason?: string
}

const hashTextFNV1a32 = (input: string): number => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

const toHexHash = (hash: number): string => hash.toString(16).padStart(8, '0')

const normalizeRatio = (value: number): number => Number(value.toFixed(3))

export const createRuntimeShellBoundaryDecision = (args: {
  readonly mode: RuntimeShellMode
  readonly reasonCode: RuntimeShellReasonCode
  readonly boundaryClass: RuntimeShellBoundaryClass
  readonly shellSource: RuntimeShellSource
  readonly reuseKey?: string
  readonly shellRef?: RuntimeShellBoundaryDecision['shellRef']
}): RuntimeShellBoundaryDecision => ({
  mode: args.mode,
  reasonCode: args.reasonCode,
  boundaryClass: args.boundaryClass,
  reuseKeyHash: args.reuseKey ? toHexHash(hashTextFNV1a32(args.reuseKey)) : undefined,
  shellRef: args.shellRef,
  shellSource: args.shellSource,
})

const shareBy = <T extends string>(items: ReadonlyArray<T>): Readonly<Record<string, number>> => {
  if (items.length === 0) return {}

  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }

  const out: Record<string, number> = {}
  for (const [key, count] of counts) {
    out[key] = normalizeRatio(count / items.length)
  }
  return out
}

export const summarizeRuntimeShellBoundaryDecisions = (
  decisions: ReadonlyArray<RuntimeShellBoundaryDecision>,
): RuntimeShellBoundaryAttribution | undefined => {
  if (decisions.length === 0) return undefined

  const noSnapshotDecisions = decisions.filter((decision) => decision.mode === 'noSnapshot')
  const boundaryClassShare = shareBy(decisions.map((decision) => decision.boundaryClass))
  const reasonShare = shareBy(noSnapshotDecisions.map((decision) => decision.reasonCode))

  let noSnapshotTopReason: string | undefined
  if (noSnapshotDecisions.length > 0) {
    const counts = new Map<string, number>()
    for (const decision of noSnapshotDecisions) {
      counts.set(decision.reasonCode, (counts.get(decision.reasonCode) ?? 0) + 1)
    }
    const ranked = Array.from(counts.entries()).sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1]
      return left[0].localeCompare(right[0])
    })
    noSnapshotTopReason = ranked[0]?.[0]
  }

  return {
    reasonShare,
    boundaryClassShare,
    noSnapshotTopReason,
  }
}
