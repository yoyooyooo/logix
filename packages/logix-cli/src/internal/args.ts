import path from 'node:path'

import { Effect } from 'effect'

import { makeCliError } from './errors.js'

export type DiagnosticsLevel = 'off' | 'light' | 'full'
export type TrialMode = 'startup' | 'scenario'
export type CliHost = 'node' | 'browser-mock'

export type EntryRef = {
  readonly modulePath: string
  readonly exportName: string
}

export type EvidenceInputRef = { readonly ref: string }
export type SelectionManifestRef = { readonly ref: string }
export type ScenarioInputRef = { readonly ref: string }
export type CliArgvSnapshot = {
  readonly tokens: ReadonlyArray<string>
  readonly digest: string
}

export type CliCommand = 'check' | 'compare' | 'trial'

export type LiveTask =
  | { readonly task: 'start' }
  | { readonly task: 'stop' }
  | { readonly task: 'status' }
  | { readonly task: 'targets'; readonly tree: boolean }
  | { readonly task: 'inspect'; readonly target: string; readonly attachmentId?: string }
  | { readonly task: 'state'; readonly target: string; readonly attachmentId?: string; readonly path?: string }
  | { readonly task: 'actions'; readonly target: string; readonly attachmentId?: string }
  | { readonly task: 'events'; readonly target: string; readonly attachmentId?: string; readonly kind?: LiveEventKind; readonly limit?: number }
  | { readonly task: 'timeline'; readonly target: string; readonly attachmentId?: string; readonly field?: string; readonly limit?: number; readonly cursor?: string }
  | { readonly task: 'fields'; readonly target: string; readonly attachmentId?: string }
  | { readonly task: 'field-graph'; readonly target: string; readonly attachmentId?: string }
  | { readonly task: 'field-summary'; readonly target: string; readonly attachmentId?: string }
  | { readonly task: 'summary'; readonly target: string; readonly attachmentId?: string }
  | { readonly task: 'capture'; readonly target: string; readonly attachmentId?: string; readonly windowMs?: number }
  | { readonly task: 'snapshot'; readonly target: string; readonly attachmentId?: string }
  | { readonly task: 'wait'; readonly target: string; readonly attachmentId?: string; readonly condition: string; readonly timeoutMs: number }
  | { readonly task: 'dispatch'; readonly target: string; readonly attachmentId?: string; readonly action: string; readonly payload?: string }
  | { readonly task: 'profile.start' | 'profile.stop' | 'profile.summary'; readonly target: string; readonly attachmentId?: string }
  | { readonly task: 'export.evidence'; readonly from: string }

export type LiveEventKind = 'diagnostic' | 'process' | 'operation' | 'state' | 'field'

export type CliInvocation =
  | {
      readonly kind: 'command'
      readonly command: 'check'
      readonly global: CliInvocation.Global
      readonly entry: EntryRef
      readonly evidence?: EvidenceInputRef
      readonly selection?: SelectionManifestRef
    }
  | {
      readonly kind: 'command'
      readonly command: 'compare'
      readonly global: CliInvocation.Global
      readonly beforeReport: string
      readonly afterReport: string
      readonly beforeEvidence?: EvidenceInputRef
      readonly afterEvidence?: EvidenceInputRef
      readonly entry?: EntryRef
    }
  | {
      readonly kind: 'command'
      readonly command: 'trial'
      readonly global: CliInvocation.Global
      readonly trialMode: TrialMode
      readonly entry: EntryRef
      readonly scenario?: ScenarioInputRef
      readonly evidence?: EvidenceInputRef
      readonly selection?: SelectionManifestRef
      readonly diagnosticsLevel: DiagnosticsLevel
      readonly maxEvents?: number
      readonly timeoutMs?: number
      readonly includeTrace: boolean
      readonly config: Record<string, string | number | boolean>
    }
  | {
      readonly kind: 'command'
      readonly command: 'live'
      readonly global: CliInvocation.Global
      readonly live: LiveTask
    }

export declare namespace CliInvocation {
  export type Global = {
    readonly runId: string
    readonly outDir?: string
    readonly budgetBytes?: number
    readonly tsconfig?: string
    readonly host: CliHost
    readonly argvSnapshot?: CliArgvSnapshot
  }
}

export type CliHelpResult = { readonly kind: 'help'; readonly text: string }

const decapitalize = (s: string): string => (s.length === 0 ? s : `${s[0]!.toLowerCase()}${s.slice(1)}`)

const parseConfigValue = (value: string): string | number | boolean => {
  const trimmed = value.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  const asNumber = Number(trimmed)
  return Number.isFinite(asNumber) ? asNumber : trimmed
}

const parseEntryRefFromOptions = (opts: {
  readonly entry?: string
}): Effect.Effect<EntryRef, ReturnType<typeof makeCliError>> => {
  const entryRaw = typeof opts.entry === 'string' ? opts.entry.trim() : undefined
  if (!entryRaw) {
    return Effect.fail(
      makeCliError({
        code: 'CLI_INVALID_ARGUMENT',
        message: '缺少入口：请提供 --entry <modulePath>#<exportName>',
      }),
    )
  }

  const hash = entryRaw.lastIndexOf('#')
  if (hash > 0 && hash < entryRaw.length - 1) {
    return Effect.succeed({ modulePath: entryRaw.slice(0, hash), exportName: entryRaw.slice(hash + 1) })
  }
  return Effect.fail(
    makeCliError({
      code: 'CLI_INVALID_ARGUMENT',
      message: `--entry 非法：${entryRaw}（期望 <modulePath>#<exportName>）`,
    }),
  )
}

const parseOptionalRef = (value: string | undefined): { readonly ref: string } | undefined => {
  const ref = typeof value === 'string' ? value.trim() : undefined
  return ref ? { ref } : undefined
}

const parseCompareInputFromOptions = (opts: {
  readonly beforeReport?: string
  readonly afterReport?: string
}): Effect.Effect<{ readonly beforeReport: string; readonly afterReport: string }, ReturnType<typeof makeCliError>> => {
  const beforeReport = typeof opts.beforeReport === 'string' ? opts.beforeReport.trim() : undefined
  const afterReport = typeof opts.afterReport === 'string' ? opts.afterReport.trim() : undefined
  if (!beforeReport || !afterReport) {
    return Effect.fail(
      makeCliError({
        code: 'CLI_INVALID_ARGUMENT',
        message: '缺少输入：请提供 --beforeReport <file> 与 --afterReport <file>',
      }),
    )
  }
  return Effect.succeed({ beforeReport, afterReport })
}

export type ParsedOptions = {
  readonly runId?: string
  readonly out?: string
  readonly outRoot?: string
  readonly budgetBytes?: number
  readonly tsconfig?: string
  readonly host: CliHost
  readonly cliConfig?: string
  readonly profile?: string
  readonly repoRoot: string
  readonly entry?: string
  readonly evidence?: string
  readonly selection?: string
  readonly scenario?: string
  readonly beforeReport?: string
  readonly afterReport?: string
  readonly beforeEvidence?: string
  readonly afterEvidence?: string
  readonly diagnosticsLevel: DiagnosticsLevel
  readonly trialMode: TrialMode
  readonly maxEvents?: number
  readonly timeoutMs?: number
  readonly includeTrace: boolean
  readonly config: Record<string, string | number | boolean>
  readonly target?: string
  readonly attachment?: string
  readonly tree: boolean
  readonly window?: string
  readonly condition?: string
  readonly action?: string
  readonly payload?: string
  readonly from?: string
  readonly path?: string
  readonly field?: string
  readonly cursor?: string
  readonly kind?: string
  readonly limit?: number
}

type LeafParsed =
  | {
      readonly command: 'check'
      readonly options: ParsedOptions
      readonly entry: EntryRef
      readonly evidence?: EvidenceInputRef
      readonly selection?: SelectionManifestRef
    }
  | {
      readonly command: 'compare'
      readonly options: ParsedOptions
      readonly beforeReport: string
      readonly afterReport: string
      readonly beforeEvidence?: EvidenceInputRef
      readonly afterEvidence?: EvidenceInputRef
      readonly entry?: EntryRef
    }
  | {
      readonly command: 'trial'
      readonly options: ParsedOptions
      readonly trialMode: TrialMode
      readonly entry: EntryRef
      readonly scenario?: ScenarioInputRef
      readonly evidence?: EvidenceInputRef
      readonly selection?: SelectionManifestRef
      readonly diagnosticsLevel: DiagnosticsLevel
      readonly maxEvents?: number
      readonly timeoutMs?: number
      readonly includeTrace: boolean
      readonly config: Record<string, string | number | boolean>
    }
  | {
      readonly command: 'live'
      readonly options: ParsedOptions
      readonly live: LiveTask
    }

const booleanOptionNames = new Set(['includeTrace', 'tree'])

const flagsWithValue = new Set([
  '--afterEvidence',
  '--afterReport',
  '--beforeEvidence',
  '--beforeReport',
  '--budgetBytes',
  '--cliConfig',
  '--config',
  '--diagnosticsLevel',
  '--entry',
  '--evidence',
  '--host',
  '--maxEvents',
  '--mode',
  '--out',
  '--outRoot',
  '--profile',
  '--repoRoot',
  '--runId',
  '--scenario',
  '--selection',
  '--timeout',
  '--tsconfig',
  '--target',
  '--attachment',
  '--window',
  '--condition',
  '--action',
  '--payload',
  '--from',
  '--path',
  '--field',
  '--cursor',
  '--kind',
  '--limit',
])

const commandTokenShapes: ReadonlyArray<ReadonlyArray<string>> = [
  ['live', 'export', 'evidence'],
  ['live', 'profile', 'summary'],
  ['live', 'profile', 'start'],
  ['live', 'profile', 'stop'],
  ['check'],
  ['compare'],
  ['trial'],
  ['live', 'start'],
  ['live', 'stop'],
  ['live', 'status'],
  ['live', 'targets'],
  ['live', 'inspect'],
  ['live', 'state'],
  ['live', 'actions'],
  ['live', 'events'],
  ['live', 'timeline'],
  ['live', 'fields'],
  ['live', 'field-graph'],
  ['live', 'field-summary'],
  ['live', 'summary'],
  ['live', 'capture'],
  ['live', 'snapshot'],
  ['live', 'wait'],
  ['live', 'dispatch'],
]

const isKnownBooleanFlag = (flag: string): boolean => {
  if (!flag.startsWith('--')) return false
  const name = flag.slice(2)
  if (booleanOptionNames.has(name)) return true
  if (name.startsWith('no')) {
    const canonical = decapitalize(name.slice(2))
    return booleanOptionNames.has(canonical)
  }
  return false
}

const canonicalOptionKey = (flag: string): string | undefined => {
  if (!flag.startsWith('--')) return undefined
  const name = flag.slice(2)
  if (isKnownBooleanFlag(flag)) {
    if (name.startsWith('no')) return decapitalize(name.slice(2))
    return name
  }
  return name
}

type ParsedOptionOccurrence = {
  readonly key?: string
  readonly tokens: ReadonlyArray<string>
  readonly allowMultiple: boolean
}

const parseOptionOccurrences = (tokens: ReadonlyArray<string>): ReadonlyArray<ParsedOptionOccurrence> => {
  const out: Array<ParsedOptionOccurrence> = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    if (token.startsWith('-')) {
      const key = canonicalOptionKey(token)
      const allowMultiple = key === 'config'
      if (flagsWithValue.has(token)) {
        const value = tokens[i + 1]
        if (value !== undefined) {
          out.push({ key, tokens: [token, value], allowMultiple })
          i += 1
          continue
        }
        out.push({ key, tokens: [token], allowMultiple })
        continue
      }
      out.push({ key, tokens: [token], allowMultiple })
      continue
    }
    out.push({ tokens: [token], allowMultiple: true })
  }
  return out
}

const dedupeOptionTokensLastWins = (tokens: ReadonlyArray<string>): ReadonlyArray<string> => {
  const occurrences = parseOptionOccurrences(tokens)
  const seen = new Set<string>()
  const kept: Array<ParsedOptionOccurrence> = []
  for (let i = occurrences.length - 1; i >= 0; i--) {
    const occ = occurrences[i]!
    if (!occ.key || occ.allowMultiple) {
      kept.push(occ)
      continue
    }
    if (seen.has(occ.key)) continue
    seen.add(occ.key)
    kept.push(occ)
  }
  kept.reverse()
  return kept.flatMap((o) => o.tokens)
}

type ExtractedCommandTokens = {
  readonly tokens: ReadonlyArray<string>
  readonly indices: ReadonlyArray<number>
}

const findTokenShape = (
  argv: ReadonlyArray<string>,
  shapes: ReadonlyArray<ReadonlyArray<string>>,
): ExtractedCommandTokens | undefined => {
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!
    if (token.startsWith('-')) {
      if (flagsWithValue.has(token)) i += 1
      continue
    }
    for (const shape of shapes) {
      if (shape[0] !== token) continue
      let ok = true
      for (let j = 1; j < shape.length; j++) {
        if (argv[i + j] !== shape[j]) {
          ok = false
          break
        }
      }
      if (!ok) continue
      return { tokens: shape, indices: shape.map((_, j) => i + j) }
    }
  }
  return undefined
}

const findCommandTokens = (argv: ReadonlyArray<string>): ExtractedCommandTokens | undefined =>
  findTokenShape(argv, commandTokenShapes)

const findUnknownCommandTokens = (argv: ReadonlyArray<string>): ExtractedCommandTokens | undefined => {
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!
    if (token.startsWith('-')) {
      if (flagsWithValue.has(token)) i += 1
      continue
    }
    const tokens: string[] = [token]
    const indices: number[] = [i]
    for (let j = i + 1; j < argv.length; j++) {
      const next = argv[j]!
      if (next.startsWith('-')) break
      tokens.push(next)
      indices.push(j)
    }
    return { tokens, indices }
  }
  return undefined
}

const normalizeArgvForParser = (argv: ReadonlyArray<string>): ReadonlyArray<string> => {
  const extracted = findCommandTokens(argv)
  if (!extracted) return dedupeOptionTokensLastWins(argv)

  const drop = new Set(extracted.indices)
  const rest = argv.filter((_, idx) => !drop.has(idx))
  return [...extracted.tokens, ...dedupeOptionTokensLastWins(rest)]
}

const ANSI_CSI_REGEX = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')

const renderValidationError = (err: unknown): string => {
  if (err instanceof Error && typeof err.message === 'string' && err.message.length > 0) {
    return err.message.replace(ANSI_CSI_REGEX, '').trim()
  }
  return typeof err === 'string' ? err : 'CLI validation failed'
}

const defaultParsedOptions = (): ParsedOptions => ({
  host: 'node',
  repoRoot: '.',
  diagnosticsLevel: 'light',
  trialMode: 'startup',
  includeTrace: false,
  tree: false,
  config: {},
})

type MutableParsedOptions = {
  -readonly [K in keyof ParsedOptions]: ParsedOptions[K]
}

const invalidArgument = (message: string, helpText: string) =>
  makeCliError({
    code: 'CLI_INVALID_ARGUMENT',
    message,
    hint: helpText,
  })

const missingFlagError = (message: string, helpText: string) =>
  makeCliError({
    code: 'CLI_INVALID_ARGUMENT',
    message,
    hint: helpText,
  })

const parsePositiveNumber = (flag: string, raw: string, helpText: string): number => {
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    throw invalidArgument(`${flag} 必须是非负数字`, helpText)
  }
  return value
}

const parseTrialMode = (raw: string, helpText: string): TrialMode => {
  if (raw === 'startup' || raw === 'scenario') return raw
  throw invalidArgument('--mode 仅支持 startup 或 scenario', helpText)
}

const parseDiagnosticsLevel = (raw: string, helpText: string): DiagnosticsLevel => {
  if (raw === 'off' || raw === 'light' || raw === 'full') return raw
  throw invalidArgument('--diagnosticsLevel 仅支持 off、light 或 full', helpText)
}

const parseHost = (raw: string, helpText: string): CliHost => {
  if (raw === 'node' || raw === 'browser-mock') return raw
  throw invalidArgument('--host 仅支持 node 或 browser-mock', helpText)
}

const parseDurationMs = (flag: string, raw: string, helpText: string): number => {
  const trimmed = raw.trim()
  if (trimmed.endsWith('ms')) return parsePositiveNumber(flag, trimmed.slice(0, -2), helpText)
  if (trimmed.endsWith('s')) return parsePositiveNumber(flag, trimmed.slice(0, -1), helpText) * 1000
  return parsePositiveNumber(flag, trimmed, helpText)
}

const parseLiveEventKind = (raw: string, helpText: string): LiveEventKind => {
  if (raw === 'diagnostic' || raw === 'process' || raw === 'operation' || raw === 'state' || raw === 'field') return raw
  throw invalidArgument('--kind 仅支持 diagnostic、process、operation、state 或 field', helpText)
}

const parseManualOptions = (
  tokens: ReadonlyArray<string>,
  helpText: string,
): Effect.Effect<ParsedOptions, ReturnType<typeof makeCliError>> =>
  Effect.sync(() => {
    const options: MutableParsedOptions = { ...defaultParsedOptions() }

    const readValue = (flag: string, index: number): string => {
      const value = tokens[index + 1]
      if (!value || value.startsWith('--')) {
        throw missingFlagError(`缺少参数值：${flag}`, helpText)
      }
      return value
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!
      if (!token.startsWith('--')) {
        throw invalidArgument(`未知参数：${token}`, helpText)
      }

      const valueFlag = flagsWithValue.has(token)
      const key = canonicalOptionKey(token)

      if (valueFlag) {
        const value = readValue(token, i)
        i += 1
        switch (key) {
          case 'runId':
            options.runId = value
            break
          case 'out':
            options.out = value
            break
          case 'outRoot':
            options.outRoot = value
            break
          case 'budgetBytes':
            options.budgetBytes = parsePositiveNumber('--budgetBytes', value, helpText)
            break
          case 'tsconfig':
            options.tsconfig = value
            break
          case 'host':
            options.host = parseHost(value, helpText)
            break
          case 'cliConfig':
            options.cliConfig = value
            break
          case 'profile':
            options.profile = value
            break
          case 'repoRoot':
            options.repoRoot = value
            break
          case 'entry':
            options.entry = value
            break
          case 'evidence':
            options.evidence = value
            break
          case 'selection':
            options.selection = value
            break
          case 'scenario':
            options.scenario = value
            break
          case 'beforeReport':
            options.beforeReport = value
            break
          case 'afterReport':
            options.afterReport = value
            break
          case 'beforeEvidence':
            options.beforeEvidence = value
            break
          case 'afterEvidence':
            options.afterEvidence = value
            break
          case 'diagnosticsLevel':
            options.diagnosticsLevel = parseDiagnosticsLevel(value, helpText)
            break
          case 'mode':
            options.trialMode = parseTrialMode(value, helpText)
            break
          case 'maxEvents':
            options.maxEvents = parsePositiveNumber('--maxEvents', value, helpText)
            break
          case 'timeout':
            options.timeoutMs = parsePositiveNumber('--timeout', value, helpText)
            break
          case 'target':
            options.target = value
            break
          case 'attachment':
            options.attachment = value
            break
          case 'window':
            options.window = value
            break
          case 'condition':
            options.condition = value
            break
          case 'action':
            options.action = value
            break
          case 'payload':
            options.payload = value
            break
          case 'from':
            options.from = value
            break
          case 'path':
            options.path = value
            break
          case 'field':
            options.field = value
            break
          case 'cursor':
            options.cursor = value
            break
          case 'kind':
            options.kind = parseLiveEventKind(value, helpText)
            break
          case 'limit':
            options.limit = parsePositiveNumber('--limit', value, helpText)
            break
          case 'config': {
            const eq = value.indexOf('=')
            if (eq <= 0) {
              throw invalidArgument(`非法 --config：${value}（期望 K=V）`, helpText)
            }
            const k = value.slice(0, eq)
            const v = value.slice(eq + 1)
            options.config = { ...options.config, [k]: parseConfigValue(v) }
            break
          }
          default:
            throw invalidArgument(`未知参数：${token}`, helpText)
        }
        continue
      }

      switch (key) {
        case 'includeTrace':
          options.includeTrace = !token.startsWith('--no')
          break
        case 'tree':
          options.tree = !token.startsWith('--no')
          break
        default:
          throw invalidArgument(`未知参数：${token}`, helpText)
      }
    }

    return options
  })

const invalidCommand = (tokens: ReadonlyArray<string>, helpText: string) =>
  makeCliError({
    code: 'CLI_INVALID_COMMAND',
    message: `未知命令：${tokens.join('.')}`,
    hint: helpText,
  })

const requireLiveOption = (value: string | undefined, flag: string, helpText: string): string => {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) throw missingFlagError(`缺少参数：${flag}`, helpText)
  return trimmed
}

const optionalLiveOption = (value: string | undefined): string | undefined => {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed ? trimmed : undefined
}

const extractLiveInspectPositionalTarget = (
  tokens: ReadonlyArray<string>,
  helpText: string,
): { readonly target: string; readonly tokens: ReadonlyArray<string> } => {
  const out: string[] = []
  let target: string | undefined

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    if (token.startsWith('--')) {
      out.push(token)
      if (flagsWithValue.has(token)) {
        const value = tokens[i + 1]
        if (value !== undefined) {
          out.push(value)
          i += 1
        }
      }
      continue
    }

    if (target !== undefined) {
      throw invalidArgument('live inspect 只接受一个 positional <target>', helpText)
    }
    target = token
  }

  if (!target || target.trim().length === 0) {
    throw missingFlagError('缺少参数：live inspect <target>', helpText)
  }

  return { target: target.trim(), tokens: out }
}

const parseLiveTask = (
  commandKey: string,
  options: ParsedOptions,
  helpText: string,
  positionalTarget?: string,
): LiveTask => {
  const attachmentId = optionalLiveOption(options.attachment)
  switch (commandKey) {
    case 'live.start':
      return { task: 'start' }
    case 'live.stop':
      return { task: 'stop' }
    case 'live.status':
      return { task: 'status' }
    case 'live.targets':
      return { task: 'targets', tree: options.tree }
    case 'live.inspect':
      return {
        task: 'inspect',
        target: requireLiveOption(positionalTarget, 'live inspect <target>', helpText),
        ...(attachmentId ? { attachmentId } : null),
      }
    case 'live.state':
      return {
        task: 'state',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
        ...(options.path ? { path: options.path } : null),
      }
    case 'live.actions':
      return {
        task: 'actions',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
      }
    case 'live.events':
      return {
        task: 'events',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
        ...(options.kind ? { kind: options.kind as LiveEventKind } : null),
        ...(typeof options.limit === 'number' ? { limit: options.limit } : null),
      }
    case 'live.timeline':
      return {
        task: 'timeline',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
        ...(options.field ? { field: options.field } : null),
        ...(typeof options.limit === 'number' ? { limit: options.limit } : null),
        ...(options.cursor ? { cursor: options.cursor } : null),
      }
    case 'live.fields':
      return {
        task: 'fields',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
      }
    case 'live.field-graph':
      return {
        task: 'field-graph',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
      }
    case 'live.field-summary':
      return {
        task: 'field-summary',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
      }
    case 'live.summary':
      return {
        task: 'summary',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
      }
    case 'live.capture':
      return {
        task: 'capture',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
        ...(options.window ? { windowMs: parseDurationMs('--window', options.window, helpText) } : null),
      }
    case 'live.snapshot':
      return {
        task: 'snapshot',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
      }
    case 'live.wait':
      return {
        task: 'wait',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
        condition: requireLiveOption(options.condition, '--condition', helpText),
        timeoutMs: typeof options.timeoutMs === 'number' ? options.timeoutMs : 5000,
      }
    case 'live.dispatch':
      return {
        task: 'dispatch',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
        action: requireLiveOption(options.action, '--action', helpText),
        ...(options.payload ? { payload: options.payload } : null),
      }
    case 'live.profile.start':
      return {
        task: 'profile.start',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
      }
    case 'live.profile.stop':
      return {
        task: 'profile.stop',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
      }
    case 'live.profile.summary':
      return {
        task: 'profile.summary',
        target: requireLiveOption(options.target, '--target', helpText),
        ...(attachmentId ? { attachmentId } : null),
      }
    case 'live.export.evidence':
      return { task: 'export.evidence', from: requireLiveOption(options.from, '--from', helpText) }
    default:
      throw invalidCommand(commandKey.split('.'), helpText)
  }
}

const parseManualLeaf = (
  argv: ReadonlyArray<string>,
  helpText: string,
): Effect.Effect<LeafParsed, unknown> =>
  Effect.gen(function* () {
    const normalized = normalizeArgvForParser(argv)
    const extracted = findCommandTokens(normalized)
    if (!extracted) {
      const unknown = findUnknownCommandTokens(normalized)
      if (unknown) return yield* Effect.fail(invalidCommand(unknown.tokens, helpText))
      return yield* Effect.fail(
        makeCliError({
          code: 'CLI_INVALID_COMMAND',
          message: '缺少命令：请提供 check、trial 或 compare',
          hint: helpText,
        }),
      )
    }

    const drop = new Set(extracted.indices)
    const commandKey = extracted.tokens.join('.')
    const restRaw = normalized.filter((_, idx) => !drop.has(idx))
    const positional =
      commandKey === 'live.inspect' ? extractLiveInspectPositionalTarget(restRaw, helpText) : undefined
    const rest = positional?.tokens ?? restRaw
    const options = yield* parseManualOptions(rest, helpText)

    switch (commandKey) {
      case 'live.start':
      case 'live.stop':
      case 'live.status':
      case 'live.targets':
      case 'live.inspect':
      case 'live.state':
      case 'live.actions':
      case 'live.events':
      case 'live.timeline':
      case 'live.fields':
      case 'live.field-graph':
      case 'live.field-summary':
      case 'live.summary':
      case 'live.capture':
      case 'live.snapshot':
      case 'live.wait':
      case 'live.dispatch':
      case 'live.profile.start':
      case 'live.profile.stop':
      case 'live.profile.summary':
      case 'live.export.evidence':
        return {
          command: 'live',
          options,
          live: parseLiveTask(commandKey, options, helpText, positional?.target),
        }
      case 'check':
        return {
          command: 'check',
          options,
          entry: yield* parseEntryRefFromOptions(options),
          ...(parseOptionalRef(options.evidence) ? { evidence: parseOptionalRef(options.evidence) } : null),
          ...(parseOptionalRef(options.selection) ? { selection: parseOptionalRef(options.selection) } : null),
        }
      case 'compare': {
        const diff = yield* parseCompareInputFromOptions(options)
        return {
          command: 'compare',
          options,
          beforeReport: diff.beforeReport,
          afterReport: diff.afterReport,
          ...(parseOptionalRef(options.beforeEvidence) ? { beforeEvidence: parseOptionalRef(options.beforeEvidence) } : null),
          ...(parseOptionalRef(options.afterEvidence) ? { afterEvidence: parseOptionalRef(options.afterEvidence) } : null),
          ...(options.entry ? { entry: yield* parseEntryRefFromOptions(options) } : null),
        }
      }
      case 'trial': {
        return {
          command: 'trial',
          options,
          trialMode: options.trialMode,
          entry: yield* parseEntryRefFromOptions(options),
          ...(parseOptionalRef(options.scenario) ? { scenario: parseOptionalRef(options.scenario) } : null),
          ...(parseOptionalRef(options.evidence) ? { evidence: parseOptionalRef(options.evidence) } : null),
          ...(parseOptionalRef(options.selection) ? { selection: parseOptionalRef(options.selection) } : null),
          diagnosticsLevel: options.diagnosticsLevel,
          ...(typeof options.maxEvents === 'number' ? { maxEvents: options.maxEvents } : null),
          ...(typeof options.timeoutMs === 'number' ? { timeoutMs: options.timeoutMs } : null),
          includeTrace: options.includeTrace,
          config: options.config,
        }
      }
      default:
        return yield* Effect.fail(invalidCommand(extracted.tokens, helpText))
    }
  })

export const parseCliInvocation = (
  argv: ReadonlyArray<string>,
  options: { readonly helpText: string },
): Effect.Effect<CliHelpResult | CliInvocation, unknown> => {
  if (argv.includes('-h') || argv.includes('--help') || argv.length === 0) {
    return Effect.succeed(({ kind: 'help', text: options.helpText } as const satisfies CliHelpResult))
  }

  return parseManualLeaf(argv, options.helpText).pipe(
    Effect.flatMap((leaf): Effect.Effect<CliHelpResult | CliInvocation, unknown> => {
      const runId = typeof leaf.options.runId === 'string' ? leaf.options.runId.trim() : undefined
      if (!runId) {
        return Effect.fail(makeCliError({ code: 'CLI_MISSING_RUNID', message: '缺少 --runId（必须显式提供）' }))
      }

      const outDirExplicit = typeof leaf.options.out === 'string' ? leaf.options.out.trim() : undefined
      const outRoot = typeof leaf.options.outRoot === 'string' ? leaf.options.outRoot.trim() : undefined
      const outDir = outDirExplicit ?? (outRoot ? path.join(outRoot, leaf.command, runId) : undefined)
      const budgetBytes = typeof leaf.options.budgetBytes === 'number' ? leaf.options.budgetBytes : undefined
      const tsconfig = typeof leaf.options.tsconfig === 'string' ? leaf.options.tsconfig.trim() : undefined

      const global: CliInvocation.Global = {
        runId,
        ...(outDir ? { outDir } : null),
        ...(budgetBytes ? { budgetBytes } : null),
        ...(tsconfig ? { tsconfig } : null),
        host: leaf.options.host,
      }

      switch (leaf.command) {
        case 'check':
          return Effect.succeed({
            kind: 'command',
            command: 'check',
            global,
            entry: leaf.entry,
            ...(leaf.evidence ? { evidence: leaf.evidence } : null),
            ...(leaf.selection ? { selection: leaf.selection } : null),
          } as const)
        case 'compare':
          return Effect.succeed({
            kind: 'command',
            command: 'compare',
            global,
            beforeReport: leaf.beforeReport,
            afterReport: leaf.afterReport,
            ...(leaf.beforeEvidence ? { beforeEvidence: leaf.beforeEvidence } : null),
            ...(leaf.afterEvidence ? { afterEvidence: leaf.afterEvidence } : null),
            ...(leaf.entry ? { entry: leaf.entry } : null),
          } as const)
        case 'trial':
          return Effect.succeed({
            kind: 'command',
            command: 'trial',
            global,
            trialMode: leaf.trialMode,
            entry: leaf.entry,
            ...(leaf.scenario ? { scenario: leaf.scenario } : null),
            ...(leaf.evidence ? { evidence: leaf.evidence } : null),
            ...(leaf.selection ? { selection: leaf.selection } : null),
            diagnosticsLevel: leaf.diagnosticsLevel,
            ...(typeof leaf.maxEvents === 'number' ? { maxEvents: leaf.maxEvents } : null),
            ...(typeof leaf.timeoutMs === 'number' ? { timeoutMs: leaf.timeoutMs } : null),
            includeTrace: leaf.includeTrace,
            config: leaf.config,
          } as const)
        case 'live':
          return Effect.succeed({
            kind: 'command',
            command: 'live',
            global,
            live: leaf.live,
          } as const)
      }
    }),
    Effect.catch((cause) => {
      if (cause && typeof cause === 'object' && (cause as { code?: unknown }).code === 'CLI_INVALID_COMMAND') {
        return Effect.fail(cause)
      }
      return Effect.fail(
        makeCliError({
          code: 'CLI_INVALID_ARGUMENT',
          message: renderValidationError(cause),
          hint: options.helpText,
          cause,
        }),
      )
    }),
  )
}
