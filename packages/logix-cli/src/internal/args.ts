import path from 'node:path'

import { Effect } from 'effect'

import { makeCliError } from './errors.js'

export type DiagnosticsLevel = 'off' | 'light' | 'full'
export type CliMode = 'report' | 'write'
export type CliHost = 'node' | 'browser-mock'

export type EntryRef = {
  readonly modulePath: string
  readonly exportName: string
}

export type IrValidateInput =
  | { readonly kind: 'dir'; readonly dir: string }
  | { readonly kind: 'file'; readonly file: string }

export type CliCommand =
  | 'describe'
  | 'ir.export'
  | 'ir.validate'
  | 'ir.diff'
  | 'trialrun'
  | 'contract-suite.run'
  | 'anchor.index'
  | 'anchor.autofill'
  | 'transform.module'
  | 'spy.evidence'

export type CliInvocation =
  | {
      readonly kind: 'command'
      readonly command: 'describe'
      readonly global: CliInvocation.Global
      readonly format: 'json'
    }
  | {
      readonly kind: 'command'
      readonly command: 'ir.export'
      readonly global: CliInvocation.Global
      readonly entry: EntryRef
    }
  | {
      readonly kind: 'command'
      readonly command: 'ir.validate'
      readonly global: CliInvocation.Global
      readonly input: IrValidateInput
    }
  | {
      readonly kind: 'command'
      readonly command: 'ir.diff'
      readonly global: CliInvocation.Global
      readonly before: string
      readonly after: string
    }
  | {
      readonly kind: 'command'
      readonly command: 'trialrun'
      readonly global: CliInvocation.Global
      readonly entry: EntryRef
      readonly diagnosticsLevel: DiagnosticsLevel
      readonly maxEvents?: number
      readonly timeoutMs?: number
      readonly includeTrace: boolean
      readonly config: Record<string, string | number | boolean>
    }
  | {
      readonly kind: 'command'
      readonly command: 'contract-suite.run'
      readonly global: CliInvocation.Global
      readonly entry: EntryRef
      readonly diagnosticsLevel: DiagnosticsLevel
      readonly maxEvents?: number
      readonly timeoutMs?: number
      readonly includeTrace: boolean
      readonly config: Record<string, string | number | boolean>
      readonly allowWarn: boolean
      readonly baselineDir?: string
      readonly includeContextPack: boolean
      readonly packMaxBytes?: number
      readonly requireRulesManifest: boolean
      readonly inputsFile?: string
      readonly includeUiKitRegistry: boolean
      readonly includeAnchorAutofill: boolean
      readonly repoRoot: string
    }
  | {
      readonly kind: 'command'
      readonly command: 'spy.evidence'
      readonly global: CliInvocation.Global
      readonly entry: EntryRef
      readonly maxUsedServices?: number
      readonly maxRawMode?: number
      readonly timeoutMs?: number
    }
  | {
      readonly kind: 'command'
      readonly command: 'anchor.index'
      readonly global: CliInvocation.Global
      readonly repoRoot: string
    }
  | {
      readonly kind: 'command'
      readonly command: 'anchor.autofill'
      readonly global: CliInvocation.Global
      readonly repoRoot: string
    }
  | {
      readonly kind: 'command'
      readonly command: 'transform.module'
      readonly global: CliInvocation.Global
      readonly repoRoot: string
      readonly opsPath: string
    }

export declare namespace CliInvocation {
  export type Global = {
    readonly runId: string
    readonly outDir?: string
    readonly budgetBytes?: number
    readonly mode?: CliMode
    readonly tsconfig?: string
    readonly host: CliHost
  }
}

export type CliHelpResult = { readonly kind: 'help'; readonly text: string }

const capitalize = (s: string): string => (s.length === 0 ? s : `${s[0]!.toUpperCase()}${s.slice(1)}`)
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

const parseIrValidateInputFromOptions = (opts: {
  readonly inDir?: string
  readonly artifact?: string
}): Effect.Effect<IrValidateInput, ReturnType<typeof makeCliError>> => {
  const dir = typeof opts.inDir === 'string' ? opts.inDir.trim() : undefined
  const file = typeof opts.artifact === 'string' ? opts.artifact.trim() : undefined

  if (dir && file) {
    return Effect.fail(
      makeCliError({
        code: 'CLI_INVALID_ARGUMENT',
        message: '参数互斥：请仅提供 --in 或 --artifact。',
      }),
    )
  }
  if (dir) return Effect.succeed({ kind: 'dir', dir })
  if (file) return Effect.succeed({ kind: 'file', file })
  return Effect.fail(
    makeCliError({
      code: 'CLI_INVALID_ARGUMENT',
      message: '缺少输入：请提供 --in <dir> 或 --artifact <file>',
    }),
  )
}

const parseIrDiffInputFromOptions = (opts: {
  readonly before?: string
  readonly after?: string
}): Effect.Effect<{ readonly before: string; readonly after: string }, ReturnType<typeof makeCliError>> => {
  const before = typeof opts.before === 'string' ? opts.before.trim() : undefined
  const after = typeof opts.after === 'string' ? opts.after.trim() : undefined
  if (!before || !after) {
    return Effect.fail(
      makeCliError({
        code: 'CLI_INVALID_ARGUMENT',
        message: '缺少输入：请提供 --before <dir|file> 与 --after <dir|file>',
      }),
    )
  }
  return Effect.succeed({ before, after })
}

export type ParsedOptions = {
  readonly runId?: string
  readonly out?: string
  readonly outRoot?: string
  readonly budgetBytes?: number
  readonly mode?: CliMode
  readonly tsconfig?: string
  readonly host: CliHost
  readonly cliConfig?: string
  readonly profile?: string
  readonly repoRoot: string
  readonly entry?: string
  readonly inDir?: string
  readonly artifact?: string
  readonly before?: string
  readonly after?: string
  readonly opsPath?: string
  readonly diagnosticsLevel: DiagnosticsLevel
  readonly maxEvents?: number
  readonly timeoutMs?: number
  readonly includeTrace: boolean
  readonly config: Record<string, string | number | boolean>
  readonly allowWarn: boolean
  readonly baselineDir?: string
  readonly includeContextPack: boolean
  readonly packMaxBytes?: number
  readonly requireRulesManifest: boolean
  readonly inputsFile?: string
  readonly includeUiKitRegistry: boolean
  readonly includeAnchorAutofill: boolean
  readonly maxUsedServices?: number
  readonly maxRawMode?: number
  readonly describeJson: boolean
}

type LeafParsed =
  | {
      readonly command: 'describe'
      readonly options: ParsedOptions
      readonly format: 'json'
    }
  | { readonly command: 'ir.export'; readonly options: ParsedOptions; readonly entry: EntryRef }
  | { readonly command: 'ir.validate'; readonly options: ParsedOptions; readonly input: IrValidateInput }
  | { readonly command: 'ir.diff'; readonly options: ParsedOptions; readonly before: string; readonly after: string }
  | {
      readonly command: 'trialrun'
      readonly options: ParsedOptions
      readonly entry: EntryRef
      readonly diagnosticsLevel: DiagnosticsLevel
      readonly maxEvents?: number
      readonly timeoutMs?: number
      readonly includeTrace: boolean
      readonly config: Record<string, string | number | boolean>
    }
  | {
      readonly command: 'contract-suite.run'
      readonly options: ParsedOptions
      readonly entry: EntryRef
      readonly diagnosticsLevel: DiagnosticsLevel
      readonly maxEvents?: number
      readonly timeoutMs?: number
      readonly includeTrace: boolean
      readonly config: Record<string, string | number | boolean>
      readonly allowWarn: boolean
      readonly baselineDir?: string
      readonly includeContextPack: boolean
      readonly packMaxBytes?: number
      readonly requireRulesManifest: boolean
      readonly inputsFile?: string
      readonly includeUiKitRegistry: boolean
      readonly includeAnchorAutofill: boolean
      readonly repoRoot: string
    }
  | {
      readonly command: 'spy.evidence'
      readonly options: ParsedOptions
      readonly entry: EntryRef
      readonly maxUsedServices?: number
      readonly maxRawMode?: number
      readonly timeoutMs?: number
    }
  | { readonly command: 'anchor.index'; readonly options: ParsedOptions; readonly repoRoot: string }
  | { readonly command: 'anchor.autofill'; readonly options: ParsedOptions; readonly repoRoot: string }
  | { readonly command: 'transform.module'; readonly options: ParsedOptions; readonly repoRoot: string; readonly opsPath: string }


const booleanOptionNames = new Set([
  'allowWarn',
  'includeAnchorAutofill',
  'includeContextPack',
  'includeTrace',
  'includeUiKitRegistry',
  'json',
  'requireRulesManifest',
])

const flagsWithValue = new Set([
  '--after',
  '--artifact',
  '--baseline',
  '--before',
  '--budgetBytes',
  '--cliConfig',
  '--config',
  '--diagnosticsLevel',
  '--entry',
  '--host',
  '--in',
  '--inputs',
  '--maxEvents',
  '--maxRawMode',
  '--maxUsedServices',
  '--mode',
  '--ops',
  '--out',
  '--outRoot',
  '--packMaxBytes',
  '--profile',
  '--repoRoot',
  '--runId',
  '--timeout',
  '--tsconfig',
])

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

const commandTokenShapes: ReadonlyArray<ReadonlyArray<string>> = [
  ['describe'],
  ['trialrun'],
  ['ir', 'export'],
  ['ir', 'validate'],
  ['ir', 'diff'],
  ['contract-suite', 'run'],
  ['spy', 'evidence'],
  ['anchor', 'index'],
  ['anchor', 'autofill'],
  ['transform', 'module'],
]

const findCommandTokens = (argv: ReadonlyArray<string>): ExtractedCommandTokens | undefined => {
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!
    if (token.startsWith('-')) {
      if (flagsWithValue.has(token)) i += 1
      continue
    }
    for (const shape of commandTokenShapes) {
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

const normalizeArgvForEffectCli = (argv: ReadonlyArray<string>): ReadonlyArray<string> => {
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
  includeTrace: false,
  config: {},
  allowWarn: false,
  includeContextPack: false,
  requireRulesManifest: false,
  includeUiKitRegistry: false,
  includeAnchorAutofill: false,
  describeJson: false,
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
            options.budgetBytes = Number(value)
            break
          case 'mode':
            options.mode = value as CliMode
            break
          case 'tsconfig':
            options.tsconfig = value
            break
          case 'host':
            options.host = value as CliHost
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
          case 'in':
            options.inDir = value
            break
          case 'artifact':
            options.artifact = value
            break
          case 'before':
            options.before = value
            break
          case 'after':
            options.after = value
            break
          case 'ops':
            options.opsPath = value
            break
          case 'diagnosticsLevel':
            options.diagnosticsLevel = value as DiagnosticsLevel
            break
          case 'maxEvents':
            options.maxEvents = Number(value)
            break
          case 'timeout':
            options.timeoutMs = Number(value)
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
          case 'baseline':
            options.baselineDir = value
            break
          case 'packMaxBytes':
            options.packMaxBytes = Number(value)
            break
          case 'inputs':
            options.inputsFile = value
            break
          case 'maxUsedServices':
            options.maxUsedServices = Number(value)
            break
          case 'maxRawMode':
            options.maxRawMode = Number(value)
            break
          default:
            throw invalidArgument(`未知参数：${token}`, helpText)
        }
        continue
      }

      switch (key) {
        case 'includeTrace':
          options.includeTrace = !token.startsWith('--no')
          break
        case 'allowWarn':
          options.allowWarn = !token.startsWith('--no')
          break
        case 'includeContextPack':
          options.includeContextPack = !token.startsWith('--no')
          break
        case 'requireRulesManifest':
          options.requireRulesManifest = !token.startsWith('--no')
          break
        case 'includeUiKitRegistry':
          options.includeUiKitRegistry = !token.startsWith('--no')
          break
        case 'includeAnchorAutofill':
          options.includeAnchorAutofill = !token.startsWith('--no')
          break
        case 'json':
          options.describeJson = !token.startsWith('--no')
          break
        default:
          throw invalidArgument(`未知参数：${token}`, helpText)
      }
    }

    return options
  })

const parseManualLeaf = (
  argv: ReadonlyArray<string>,
  helpText: string,
): Effect.Effect<LeafParsed, unknown> =>
  Effect.gen(function* () {
    const normalized = normalizeArgvForEffectCli(argv)
    const extracted = findCommandTokens(normalized)
    if (!extracted) {
      return yield* Effect.fail(
        makeCliError({
          code: 'CLI_INVALID_COMMAND',
          message: '缺少命令：请提供 <group> <subcommand>（或 trialrun）',
          hint: helpText,
        }),
      )
    }

    const drop = new Set(extracted.indices)
    const rest = normalized.filter((_, idx) => !drop.has(idx))
    const options = yield* parseManualOptions(rest, helpText)
    const commandKey = extracted.tokens.join('.')

    switch (commandKey) {
      case 'describe':
        if (!options.describeJson) {
          return yield* Effect.fail(invalidArgument('describe 仅支持机器可读输出，请显式提供 --json', helpText))
        }
        return { command: 'describe', options, format: 'json' as const }
      case 'ir.export':
        return { command: 'ir.export', options, entry: yield* parseEntryRefFromOptions(options) }
      case 'ir.validate':
        return { command: 'ir.validate', options, input: yield* parseIrValidateInputFromOptions(options) }
      case 'ir.diff': {
        const diff = yield* parseIrDiffInputFromOptions(options)
        return { command: 'ir.diff', options, before: diff.before, after: diff.after }
      }
      case 'trialrun':
        return {
          command: 'trialrun',
          options,
          entry: yield* parseEntryRefFromOptions(options),
          diagnosticsLevel: options.diagnosticsLevel,
          ...(typeof options.maxEvents === 'number' ? { maxEvents: options.maxEvents } : null),
          ...(typeof options.timeoutMs === 'number' ? { timeoutMs: options.timeoutMs } : null),
          includeTrace: options.includeTrace,
          config: options.config,
        }
      case 'contract-suite.run':
        return {
          command: 'contract-suite.run',
          options,
          entry: yield* parseEntryRefFromOptions(options),
          diagnosticsLevel: options.diagnosticsLevel,
          ...(typeof options.maxEvents === 'number' ? { maxEvents: options.maxEvents } : null),
          ...(typeof options.timeoutMs === 'number' ? { timeoutMs: options.timeoutMs } : null),
          includeTrace: options.includeTrace,
          config: options.config,
          allowWarn: options.allowWarn,
          ...(options.baselineDir ? { baselineDir: options.baselineDir } : null),
          includeContextPack: options.includeContextPack,
          ...(typeof options.packMaxBytes === 'number' ? { packMaxBytes: options.packMaxBytes } : null),
          requireRulesManifest: options.requireRulesManifest,
          ...(options.inputsFile ? { inputsFile: options.inputsFile } : null),
          includeUiKitRegistry: options.includeUiKitRegistry,
          includeAnchorAutofill: options.includeAnchorAutofill,
          repoRoot: options.repoRoot,
        }
      case 'spy.evidence':
        return {
          command: 'spy.evidence',
          options,
          entry: yield* parseEntryRefFromOptions(options),
          ...(typeof options.maxUsedServices === 'number' ? { maxUsedServices: options.maxUsedServices } : null),
          ...(typeof options.maxRawMode === 'number' ? { maxRawMode: options.maxRawMode } : null),
          ...(typeof options.timeoutMs === 'number' ? { timeoutMs: options.timeoutMs } : null),
        }
      case 'anchor.index':
        return { command: 'anchor.index', options, repoRoot: options.repoRoot }
      case 'anchor.autofill':
        return { command: 'anchor.autofill', options, repoRoot: options.repoRoot }
      case 'transform.module': {
        const opsPath = typeof options.opsPath === 'string' && options.opsPath.length > 0 ? options.opsPath : undefined
        if (!opsPath) {
          return yield* Effect.fail(invalidArgument('缺少输入：请提供 --ops <delta.json|->', helpText))
        }
        return { command: 'transform.module', options, repoRoot: options.repoRoot, opsPath }
      }
      default:
        return yield* Effect.fail(
          makeCliError({
            code: 'CLI_INVALID_COMMAND',
            message: `未知命令：${commandKey}`,
            hint: helpText,
          }),
        )
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
      const mode = leaf.options.mode
      const tsconfig = typeof leaf.options.tsconfig === 'string' ? leaf.options.tsconfig.trim() : undefined

      const global: CliInvocation.Global = {
        runId,
        ...(outDir ? { outDir } : null),
        ...(budgetBytes ? { budgetBytes } : null),
        ...(mode ? { mode } : null),
        ...(tsconfig ? { tsconfig } : null),
        host: leaf.options.host,
      }

      switch (leaf.command) {
        case 'describe':
          return Effect.succeed(({ kind: 'command', command: 'describe', global, format: leaf.format } as const))
        case 'ir.export':
          return Effect.succeed(({ kind: 'command', command: 'ir.export', global, entry: leaf.entry } as const))
        case 'ir.validate':
          return Effect.succeed(({ kind: 'command', command: 'ir.validate', global, input: leaf.input } as const))
        case 'ir.diff':
          return Effect.succeed(({ kind: 'command', command: 'ir.diff', global, before: leaf.before, after: leaf.after } as const))
        case 'trialrun':
          return Effect.succeed({
            kind: 'command',
            command: 'trialrun',
            global,
            entry: leaf.entry,
            diagnosticsLevel: leaf.diagnosticsLevel,
            ...(typeof leaf.maxEvents === 'number' ? { maxEvents: leaf.maxEvents } : null),
            ...(typeof leaf.timeoutMs === 'number' ? { timeoutMs: leaf.timeoutMs } : null),
            includeTrace: leaf.includeTrace,
            config: leaf.config,
          } as const)
        case 'contract-suite.run':
          return Effect.succeed({
            kind: 'command',
            command: 'contract-suite.run',
            global,
            entry: leaf.entry,
            diagnosticsLevel: leaf.diagnosticsLevel,
            ...(typeof leaf.maxEvents === 'number' ? { maxEvents: leaf.maxEvents } : null),
            ...(typeof leaf.timeoutMs === 'number' ? { timeoutMs: leaf.timeoutMs } : null),
            includeTrace: leaf.includeTrace,
            config: leaf.config,
            allowWarn: leaf.allowWarn,
            ...(leaf.baselineDir ? { baselineDir: leaf.baselineDir } : null),
            includeContextPack: leaf.includeContextPack,
            ...(typeof leaf.packMaxBytes === 'number' ? { packMaxBytes: leaf.packMaxBytes } : null),
            requireRulesManifest: leaf.requireRulesManifest,
            ...(leaf.inputsFile ? { inputsFile: leaf.inputsFile } : null),
            includeUiKitRegistry: leaf.includeUiKitRegistry,
            includeAnchorAutofill: leaf.includeAnchorAutofill,
            repoRoot: leaf.repoRoot,
          } as const)
        case 'spy.evidence':
          return Effect.succeed({
            kind: 'command',
            command: 'spy.evidence',
            global,
            entry: leaf.entry,
            ...(typeof leaf.maxUsedServices === 'number' ? { maxUsedServices: leaf.maxUsedServices } : null),
            ...(typeof leaf.maxRawMode === 'number' ? { maxRawMode: leaf.maxRawMode } : null),
            ...(typeof leaf.timeoutMs === 'number' ? { timeoutMs: leaf.timeoutMs } : null),
          } as const)
        case 'anchor.index':
          return Effect.succeed(({ kind: 'command', command: 'anchor.index', global, repoRoot: leaf.repoRoot } as const))
        case 'anchor.autofill':
          return Effect.succeed(({ kind: 'command', command: 'anchor.autofill', global, repoRoot: leaf.repoRoot } as const))
        case 'transform.module':
          return Effect.succeed(
            ({ kind: 'command', command: 'transform.module', global, repoRoot: leaf.repoRoot, opsPath: leaf.opsPath } as const),
          )
      }
    }),
    Effect.catch((cause) =>
      Effect.fail(
        makeCliError({
          code: 'CLI_INVALID_ARGUMENT',
          message: renderValidationError(cause),
          hint: options.helpText,
          cause,
        }),
      ),
    ),
  )
}
