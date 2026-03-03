import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

type Mode =
  | { readonly kind: 'worktree' }
  | { readonly kind: 'cached' }
  | { readonly kind: 'base'; readonly base: string }

type ViolationType = 'RANDOM_STABLE_ID' | 'COARSE_EXIT_CODE' | 'UNREGISTERED_REASON_CODE'

type Violation = {
  readonly type: ViolationType
  readonly file: string
  readonly line: string
  readonly detail: string
}

const CHECK_NAME = 'protocol-antipatterns'
const REASON_CATALOG_PATH = 'specs/103-cli-minimal-kernel-self-loop/contracts/reason-catalog.md'

const parseArgs = (argv: ReadonlyArray<string>): Mode => {
  let mode: Mode = { kind: 'worktree' }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--cached') {
      mode = { kind: 'cached' }
      continue
    }
    if (arg === '--base') {
      const base = argv[i + 1]
      if (!base) throw new Error('Missing value for --base <ref>')
      i += 1
      mode = { kind: 'base', base }
      continue
    }
    if (arg === '--help' || arg === '-h') {
      // eslint-disable-next-line no-console
      console.log(
        [
          'Usage: tsx scripts/checks/protocol-antipatterns.ts [--cached] [--base <ref>]',
          '',
          'Checks no-copy anti-patterns for spec 103:',
          '1) no random stable ids (instanceId/txnSeq/opSeq/attemptSeq)',
          '2) no coarse exit-code mapping (only 0/1 or forcing non-pass verdict to 1)',
          '3) no reasonCode outside reason-catalog.md',
        ].join('\n'),
      )
      process.exit(0)
    }
  }

  return mode
}

const runGitDiff = (mode: Mode): string => {
  const cmd =
    mode.kind === 'cached'
      ? 'git diff --cached --unified=0'
      : mode.kind === 'base'
        ? `git diff --unified=0 ${mode.base}...HEAD`
        : 'git diff --unified=0 HEAD'

  return execSync(cmd, {
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024 * 128,
  }).toString('utf-8')
}

const normalizePathForMatch = (file: string): string => file.replace(/\\/g, '/').toLowerCase()

const isTestOrSpecFile = (file: string): boolean => {
  const normalized = normalizePathForMatch(file)
  if (/(^|\/)(test|tests|__tests__)\//.test(normalized)) return true
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(normalized)) return true
  return false
}

const shouldCheckCodeFile = (file: string): boolean => {
  if (isTestOrSpecFile(file)) return false
  const lower = file.toLowerCase()
  if (lower.endsWith('.ts') || lower.endsWith('.tsx') || lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
    return true
  }
  return false
}

const readRegisteredReasonCodes = (): ReadonlySet<string> => {
  if (!fs.existsSync(REASON_CATALOG_PATH)) {
    throw new Error(`Missing reason catalog: ${REASON_CATALOG_PATH}`)
  }

  const text = fs.readFileSync(REASON_CATALOG_PATH, 'utf-8')
  const set = new Set<string>()
  const regex = /`([A-Z][A-Z0-9_]{2,})`/g
  let match: RegExpExecArray | null = regex.exec(text)
  while (match) {
    const value = match[1]
    if (value) set.add(value)
    match = regex.exec(text)
  }
  return set
}

export const extractReasonCodesInContext = (line: string): ReadonlyArray<string> => {
  const out = new Set<string>()

  const reasonCodeRe = /\breasonCode\s*[:=]\s*['"`]([A-Z][A-Z0-9_]{2,})['"`]/g
  let reasonCodeMatch = reasonCodeRe.exec(line)
  while (reasonCodeMatch) {
    const code = reasonCodeMatch[1]
    if (code) out.add(code)
    reasonCodeMatch = reasonCodeRe.exec(line)
  }

  const ifReasonCodesRe = /\bifReasonCodes\s*:\s*\[([^\]]*)\]/g
  let ifReasonCodesMatch = ifReasonCodesRe.exec(line)
  while (ifReasonCodesMatch) {
    const segment = ifReasonCodesMatch[1] ?? ''
    const quotedCodes = segment.match(/['"`]([A-Z][A-Z0-9_]{2,})['"`]/g) ?? []
    for (const quotedCode of quotedCodes) {
      const code = quotedCode.slice(1, -1)
      if (code) out.add(code)
    }
    ifReasonCodesMatch = ifReasonCodesRe.exec(line)
  }

  return Array.from(out)
}

const REASON_CODE_IGNORE = new Set<string>([
  'PASS',
  'VIOLATION',
  'RETRYABLE',
  'NO_PROGRESS',
  'NOT_IMPLEMENTED',
  'ERROR',
  'HEAD',
  'EOF',
  'EAGAIN',
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ENOENT',
  'ENOTFOUND',
  'JSON',
])

export const isRandomStableIdLine = (line: string): boolean => {
  if (!/(instanceId|txnSeq|opSeq|attemptSeq)/.test(line)) return false
  return /(Math\.random\(|crypto\.randomUUID\(|Date\.now\()/.test(line)
}

export const isCoarseExitCodeLine = (line: string): boolean => {
  const normalized = line.replace(/\s+/g, ' ')
  if (!normalized.includes('exitCode')) return false

  if (/exitCode\s*[:=]\s*(1|0)\b/.test(normalized) && /(VIOLATION|RETRYABLE|NO_PROGRESS|NOT_IMPLEMENTED|ERROR)/.test(normalized)) {
    return true
  }

  if (/exitCode[^;]*\?[^:]*0[^:]*:[^;]*1/.test(normalized)) {
    return true
  }

  if (/exitCode[^;]*\?[^:]*1[^:]*:[^;]*0/.test(normalized)) {
    return true
  }

  return false
}

const makeViolation = (type: ViolationType, file: string, line: string, detail: string): Violation => ({
  type,
  file,
  line: line.trim(),
  detail,
})

const fail = (payload: unknown, code = 1): never => {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(payload, null, 2))
  process.exit(code)
}

const main = (): void => {
  const mode = parseArgs(process.argv.slice(2))
  const registeredReasonCodes = readRegisteredReasonCodes()

  let diff = ''
  try {
    diff = runGitDiff(mode)
  } catch (error) {
    fail(
      {
        check: CHECK_NAME,
        ok: false,
        reasonCode: 'CLI_NO_COPY_GIT_DIFF_FAILED',
        mode: mode.kind === 'base' ? `base:${mode.base}` : mode.kind,
        message: error instanceof Error ? error.message : String(error),
      },
      2,
    )
  }

  let currentFile: string | undefined
  const violations: Violation[] = []

  for (const rawLine of diff.split('\n')) {
    if (rawLine.startsWith('+++ b/')) {
      currentFile = rawLine.slice('+++ b/'.length).trim()
      continue
    }

    if (!currentFile) continue
    if (!shouldCheckCodeFile(currentFile)) continue

    if (rawLine.startsWith('+++')) continue
    if (!rawLine.startsWith('+')) continue

    const added = rawLine.slice(1)
    if (!added.trim()) continue

    if (isRandomStableIdLine(added)) {
      violations.push(
        makeViolation('RANDOM_STABLE_ID', currentFile, added, 'Stable IDs must not be generated from random/time-based sources.'),
      )
    }

    if (isCoarseExitCodeLine(added)) {
      violations.push(
        makeViolation('COARSE_EXIT_CODE', currentFile, added, 'Exit code mapping must preserve semantic verdicts, not 0/1 coarse mapping.'),
      )
    }

    const reasonCandidates = extractReasonCodesInContext(added)
    for (const candidate of reasonCandidates) {
      if (REASON_CODE_IGNORE.has(candidate)) continue
      if (registeredReasonCodes.has(candidate)) continue

      violations.push(
        makeViolation(
          'UNREGISTERED_REASON_CODE',
          currentFile,
          added,
          `Reason code "${candidate}" is not registered in ${path.basename(REASON_CATALOG_PATH)}.`,
        ),
      )
    }
  }

  if (violations.length > 0) {
    fail({
      check: CHECK_NAME,
      ok: false,
      reasonCode: 'CLI_NO_COPY_ANTIPATTERNS',
      mode: mode.kind === 'base' ? `base:${mode.base}` : mode.kind,
      count: violations.length,
      violations,
    })
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      check: CHECK_NAME,
      ok: true,
      reasonCode: 'VERIFY_PASS',
      mode: mode.kind === 'base' ? `base:${mode.base}` : mode.kind,
    }),
  )
}

const isDirectRun = (): boolean => {
  const entry = process.argv[1]
  if (!entry) return false
  return pathToFileURL(path.resolve(entry)).href === import.meta.url
}

if (isDirectRun()) {
  main()
}
