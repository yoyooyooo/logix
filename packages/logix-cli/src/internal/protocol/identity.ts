export type IdentityCounters = {
  readonly instanceId: string
  readonly txnSeq: number
  readonly opSeq: number
  readonly attemptSeq: number
}

const ATTEMPT_SUFFIX_RE = /-attempt-(\d+)$/u

const sanitizeToken = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized.length > 0 ? normalized : 'unknown'
}

const canonicalRunRoot = (runId: string): string => {
  const trimmed = runId.trim()
  if (trimmed.length === 0) return trimmed
  return trimmed.replace(ATTEMPT_SUFFIX_RE, '')
}

export const parseAttemptSeqFromRunId = (runId: string): number => {
  const parsed = extractAttemptSeqSuffix(runId)
  return typeof parsed === 'number' ? parsed : 1
}

export const extractAttemptSeqSuffix = (runId: string): number | undefined => {
  const matched = runId.trim().match(ATTEMPT_SUFFIX_RE)
  if (!matched) return undefined
  const parsed = Number.parseInt(matched[1] ?? '', 10)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined
}

export const makeInstanceIdFromRun = (runId: string): string => sanitizeToken(canonicalRunRoot(runId))

export const createIdentityAllocator = (runId: string) => {
  const instanceId = makeInstanceIdFromRun(runId)
  let txnSeq = 1
  let opSeq = 1
  let attemptSeq = parseAttemptSeqFromRunId(runId)

  const current = (): IdentityCounters => ({ instanceId, txnSeq, opSeq, attemptSeq })

  return {
    current,
    nextTxn(): IdentityCounters {
      txnSeq += 1
      return current()
    },
    nextOp(): IdentityCounters {
      opSeq += 1
      return current()
    },
    nextAttempt(): IdentityCounters {
      attemptSeq += 1
      return current()
    },
  }
}
