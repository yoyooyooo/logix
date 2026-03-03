import path from 'node:path'

import { CliConfig, CommandDescriptor, CommandDirective, HelpDoc, Options, ValidationError } from '@effect/cli'
import { NodeContext } from '@effect/platform-node'
import { Effect, Option as FxOption } from 'effect'
import * as HashMap from 'effect/HashMap'

import { makeCliError } from './errors.js'

export type DiagnosticsLevel = 'off' | 'light' | 'full'
export type CliMode = 'report' | 'write'
export type CliHost = 'node' | 'browser-mock'
export type VerifyLoopMode = 'run' | 'resume'
export type VerifyLoopGateScope = 'runtime' | 'governance'
export type VerifyLoopExecutor = 'real' | 'fixture'
export type TrialRunEmit = 'none' | 'evidence'
export type IrValidateProfile = 'contract' | 'cross-module'
export type NextActionsEngine = 'bootstrap'

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
  | 'extension.validate'
  | 'extension.load'
  | 'extension.reload'
  | 'extension.status'
  | 'trialrun'
  | 'contract-suite.run'
  | 'verify-loop'
  | 'next-actions.exec'
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
      readonly withAnchors: boolean
    }
  | {
      readonly kind: 'command'
      readonly command: 'ir.validate'
      readonly global: CliInvocation.Global
      readonly input: IrValidateInput
      readonly profile?: IrValidateProfile
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
      readonly command: 'extension.validate'
      readonly global: CliInvocation.Global
      readonly manifestPath: string
    }
  | {
      readonly kind: 'command'
      readonly command: 'extension.load'
      readonly global: CliInvocation.Global
      readonly manifestPath: string
      readonly stateFile: string
    }
  | {
      readonly kind: 'command'
      readonly command: 'extension.reload'
      readonly global: CliInvocation.Global
      readonly stateFile: string
    }
  | {
      readonly kind: 'command'
      readonly command: 'extension.status'
      readonly global: CliInvocation.Global
      readonly stateFile: string
      readonly json: boolean
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
      readonly emit: TrialRunEmit
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
      readonly command: 'verify-loop'
      readonly global: CliInvocation.Global
      readonly mode: VerifyLoopMode
      readonly gateScope: VerifyLoopGateScope
      readonly target: string
      readonly executor?: VerifyLoopExecutor
      readonly emitNextActions: boolean
      readonly emitNextActionsOut?: string
      readonly instanceId?: string
      readonly maxAttempts?: number
      readonly previousRunId?: string
      readonly previousReasonCode?: string
    }
  | {
      readonly kind: 'command'
      readonly command: 'next-actions.exec'
      readonly global: CliInvocation.Global
      readonly reportPath: string
      readonly engine: NextActionsEngine
      readonly strict: boolean
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

const optionalText = (name: string): Options.Options<string | undefined> =>
  Options.text(name).pipe(
    Options.optional,
    Options.map((opt) => FxOption.getOrUndefined(opt)),
  )

const optionalChoice = <A extends string>(name: string, choices: ReadonlyArray<A>): Options.Options<A | undefined> =>
  Options.choice(name, choices as any).pipe(
    Options.optional,
    Options.map((opt) => FxOption.getOrUndefined(opt) as A | undefined),
  )

const positiveIntOptional = (name: string): Options.Options<number | undefined> =>
  Options.integer(name).pipe(
    Options.optional,
    Options.mapEffect((opt) =>
      FxOption.match(opt, {
        onNone: () => Effect.succeed(undefined),
        onSome: (n) =>
          n > 0
            ? Effect.succeed(n)
            : Effect.fail(ValidationError.invalidValue(HelpDoc.p(`--${name} 必须是正整数`))),
      }),
    ),
  )

const booleanWithNegation = (name: string): Options.Options<boolean> =>
  Options.boolean(name, { negationNames: [`no${capitalize(name)}`] })

const parseConfigValue = (value: string): string | number | boolean => {
  const trimmed = value.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  const asNumber = Number(trimmed)
  return Number.isFinite(asNumber) ? asNumber : trimmed
}

const configFlags = Options.keyValueMap('config').pipe(
  Options.withDefault(HashMap.empty()),
  Options.map((hm) => {
    const out: Record<string, string | number | boolean> = {}
    for (const [k, v] of HashMap.toEntries(hm)) out[k] = parseConfigValue(v)
    return out
  }),
)

const parseEntryRefFromOptions = (opts: {
  readonly entry?: string
}): Effect.Effect<EntryRef, ValidationError.ValidationError> => {
  const entryRaw = typeof opts.entry === 'string' ? opts.entry.trim() : undefined
  if (!entryRaw) {
    return Effect.fail(ValidationError.missingFlag(HelpDoc.p('缺少入口：请提供 --entry <modulePath>#<exportName>')))
  }

  const hash = entryRaw.lastIndexOf('#')
  if (hash > 0 && hash < entryRaw.length - 1) {
    return Effect.succeed({ modulePath: entryRaw.slice(0, hash), exportName: entryRaw.slice(hash + 1) })
  }
  return Effect.fail(ValidationError.invalidValue(HelpDoc.p(`--entry 非法：${entryRaw}（期望 <modulePath>#<exportName>）`)))
}

const parseIrValidateInputFromOptions = (opts: {
  readonly inDir?: string
  readonly artifact?: string
}): Effect.Effect<IrValidateInput, ValidationError.ValidationError> => {
  const dir = typeof opts.inDir === 'string' ? opts.inDir.trim() : undefined
  const file = typeof opts.artifact === 'string' ? opts.artifact.trim() : undefined

  if (dir && file) {
    return Effect.fail(ValidationError.invalidValue(HelpDoc.p('参数互斥：请仅提供 --in 或 --artifact。')))
  }
  if (dir) return Effect.succeed({ kind: 'dir', dir })
  if (file) return Effect.succeed({ kind: 'file', file })
  return Effect.fail(ValidationError.missingFlag(HelpDoc.p('缺少输入：请提供 --in <dir> 或 --artifact <file>')))
}

const parseIrValidateProfileFromOptions = (opts: {
  readonly profile?: string
}): Effect.Effect<IrValidateProfile | undefined, ValidationError.ValidationError> => {
  const profile = typeof opts.profile === 'string' ? opts.profile.trim() : undefined
  if (!profile) return Effect.succeed(undefined)
  if (profile === 'contract') return Effect.succeed('contract')
  if (profile === 'cross-module') return Effect.succeed('cross-module')
  return Effect.fail(ValidationError.invalidValue(HelpDoc.p(`--profile 非法：${profile}（ir validate 支持 contract/cross-module）`)))
}

const parseIrDiffInputFromOptions = (opts: {
  readonly before?: string
  readonly after?: string
}): Effect.Effect<{ readonly before: string; readonly after: string }, ValidationError.ValidationError> => {
  const before = typeof opts.before === 'string' ? opts.before.trim() : undefined
  const after = typeof opts.after === 'string' ? opts.after.trim() : undefined
  if (!before || !after) {
    return Effect.fail(ValidationError.missingFlag(HelpDoc.p('缺少输入：请提供 --before <dir|file> 与 --after <dir|file>')))
  }
  return Effect.succeed({ before, after })
}

const parseManifestPathFromOptions = (opts: {
  readonly manifest?: string
}): Effect.Effect<string, ValidationError.ValidationError> => {
  const manifestPath = typeof opts.manifest === 'string' ? opts.manifest.trim() : ''
  if (manifestPath.length === 0) {
    return Effect.fail(ValidationError.missingFlag(HelpDoc.p('缺少参数：请提供 --manifest <path>')))
  }
  return Effect.succeed(manifestPath)
}

const parseStateFileFromOptions = (opts: {
  readonly stateFile?: string
}): Effect.Effect<string, ValidationError.ValidationError> => {
  const stateFile = typeof opts.stateFile === 'string' ? opts.stateFile.trim() : ''
  if (stateFile.length === 0) {
    return Effect.fail(ValidationError.missingFlag(HelpDoc.p('缺少参数：请提供 --stateFile <path>')))
  }
  return Effect.succeed(stateFile)
}

const parseVerifyLoopInputFromOptions = (opts: {
  readonly verifyLoopMode?: VerifyLoopMode
  readonly gateScope?: VerifyLoopGateScope
  readonly target?: string
  readonly executor?: VerifyLoopExecutor
  readonly emitNextActions: boolean
  readonly emitNextActionsOut?: string
  readonly instanceId?: string
  readonly maxAttempts?: number
  readonly previousRunId?: string
  readonly previousReasonCode?: string
}): Effect.Effect<
  {
    readonly mode: VerifyLoopMode
    readonly gateScope: VerifyLoopGateScope
    readonly target: string
    readonly executor?: VerifyLoopExecutor
    readonly emitNextActions: boolean
    readonly emitNextActionsOut?: string
    readonly instanceId?: string
    readonly maxAttempts?: number
    readonly previousRunId?: string
    readonly previousReasonCode?: string
  },
  ValidationError.ValidationError
> => {
  const mode = opts.verifyLoopMode
  if (!mode) {
    return Effect.fail(ValidationError.missingFlag(HelpDoc.p('缺少参数：请提供 --mode <run|resume>')))
  }

  const target = typeof opts.target === 'string' ? opts.target.trim() : ''
  if (target.length === 0) {
    return Effect.fail(ValidationError.missingFlag(HelpDoc.p('缺少参数：请提供 --target <value>')))
  }

  const gateScope = opts.gateScope ?? 'runtime'
  const executor = opts.executor
  const emitNextActionsOut = typeof opts.emitNextActionsOut === 'string' ? opts.emitNextActionsOut.trim() : undefined
  const emitNextActions = opts.emitNextActions || Boolean(emitNextActionsOut)
  const instanceId = typeof opts.instanceId === 'string' ? opts.instanceId.trim() : undefined
  const previousRunId = typeof opts.previousRunId === 'string' ? opts.previousRunId.trim() : undefined
  const previousReasonCode = typeof opts.previousReasonCode === 'string' ? opts.previousReasonCode.trim() : undefined

  if (mode === 'resume' && !previousRunId) {
    return Effect.fail(ValidationError.missingFlag(HelpDoc.p('缺少参数：--mode resume 需要 --previousRunId <runId>')))
  }

  if (mode === 'resume' && !instanceId) {
    return Effect.fail(ValidationError.missingFlag(HelpDoc.p('缺少参数：--mode resume 需要 --instanceId <instanceId>')))
  }

  if (mode === 'run' && previousRunId) {
    return Effect.fail(ValidationError.invalidValue(HelpDoc.p('--previousRunId 仅在 --mode resume 时允许提供')))
  }

  if (mode === 'run' && previousReasonCode) {
    return Effect.fail(ValidationError.invalidValue(HelpDoc.p('--previousReasonCode 仅在 --mode resume 时允许提供')))
  }

  return Effect.succeed({
    mode,
    gateScope,
    target,
    ...(executor ? { executor } : null),
    emitNextActions,
    ...(emitNextActionsOut ? { emitNextActionsOut } : null),
    ...(instanceId ? { instanceId } : null),
    ...(typeof opts.maxAttempts === 'number' ? { maxAttempts: opts.maxAttempts } : null),
    ...(previousRunId ? { previousRunId } : null),
    ...(previousReasonCode ? { previousReasonCode } : null),
  })
}

const parseNextActionsExecInputFromOptions = (opts: {
  readonly report?: string
  readonly dsl?: string
  readonly nextActionsEngine?: NextActionsEngine
  readonly strict: boolean
}): Effect.Effect<
  {
    readonly reportPath: string
    readonly engine: NextActionsEngine
    readonly strict: boolean
  },
  ValidationError.ValidationError
> => {
  const dslPath = typeof opts.dsl === 'string' ? opts.dsl.trim() : undefined
  const reportPath = typeof opts.report === 'string' ? opts.report.trim() : dslPath ?? 'verify-loop.report.json'
  if (reportPath.length === 0) {
    return Effect.fail(ValidationError.invalidValue(HelpDoc.p('--report 不能为空')))
  }
  return Effect.succeed({
    reportPath,
    engine: opts.nextActionsEngine ?? 'bootstrap',
    strict: opts.strict,
  })
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
  readonly manifest?: string
  readonly stateFile?: string
  readonly opsPath?: string
  readonly diagnosticsLevel: DiagnosticsLevel
  readonly maxEvents?: number
  readonly timeoutMs?: number
  readonly includeTrace: boolean
  readonly withAnchors: boolean
  readonly emit: TrialRunEmit
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
  readonly verifyLoopMode?: VerifyLoopMode
  readonly gateScope?: VerifyLoopGateScope
  readonly target?: string
  readonly executor?: VerifyLoopExecutor
  readonly emitNextActions: boolean
  readonly emitNextActionsOut?: string
  readonly instanceId?: string
  readonly maxAttempts?: number
  readonly previousRunId?: string
  readonly previousReasonCode?: string
  readonly report?: string
  readonly dsl?: string
  readonly nextActionsEngine?: NextActionsEngine
  readonly strict: boolean
  readonly describeJson: boolean
}

type LeafParsed =
  | {
      readonly command: 'describe'
      readonly options: ParsedOptions
      readonly format: 'json'
    }
  | { readonly command: 'ir.export'; readonly options: ParsedOptions; readonly entry: EntryRef; readonly withAnchors: boolean }
  | {
      readonly command: 'ir.validate'
      readonly options: ParsedOptions
      readonly input: IrValidateInput
      readonly profile?: IrValidateProfile
    }
  | { readonly command: 'ir.diff'; readonly options: ParsedOptions; readonly before: string; readonly after: string }
  | { readonly command: 'extension.validate'; readonly options: ParsedOptions; readonly manifestPath: string }
  | { readonly command: 'extension.load'; readonly options: ParsedOptions; readonly manifestPath: string; readonly stateFile: string }
  | { readonly command: 'extension.reload'; readonly options: ParsedOptions; readonly stateFile: string }
  | { readonly command: 'extension.status'; readonly options: ParsedOptions; readonly stateFile: string; readonly json: boolean }
  | {
      readonly command: 'trialrun'
      readonly options: ParsedOptions
      readonly entry: EntryRef
      readonly diagnosticsLevel: DiagnosticsLevel
      readonly maxEvents?: number
      readonly timeoutMs?: number
      readonly includeTrace: boolean
      readonly emit: TrialRunEmit
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
      readonly command: 'verify-loop'
      readonly options: ParsedOptions
      readonly mode: VerifyLoopMode
      readonly gateScope: VerifyLoopGateScope
      readonly target: string
      readonly executor?: VerifyLoopExecutor
      readonly emitNextActions: boolean
      readonly emitNextActionsOut?: string
      readonly instanceId?: string
      readonly maxAttempts?: number
      readonly previousRunId?: string
      readonly previousReasonCode?: string
    }
  | {
      readonly command: 'next-actions.exec'
      readonly options: ParsedOptions
      readonly reportPath: string
      readonly engine: NextActionsEngine
      readonly strict: boolean
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

const repoRootWithDefault = Options.text('repoRoot').pipe(Options.withDefault('.'))

const trialRunEmitOption: Options.Options<TrialRunEmit> = Options.choice('emit', ['evidence'] as const).pipe(
  Options.optional,
  Options.map((opt) =>
    FxOption.match(opt, {
      onNone: () => 'none' as const,
      onSome: (value) => value as TrialRunEmit,
    }),
  ),
)

const baseOptions: Options.Options<ParsedOptions> = Options.all({
  runId: optionalText('runId'),
  out: optionalText('out'),
  outRoot: optionalText('outRoot'),
  budgetBytes: positiveIntOptional('budgetBytes'),
  mode: optionalChoice<CliMode>('mode', ['report', 'write']),
  tsconfig: optionalText('tsconfig'),
  host: Options.choice('host', ['node', 'browser-mock'] as const).pipe(Options.withDefault('node')),
  cliConfig: optionalText('cliConfig'),
  profile: optionalText('profile'),
  repoRoot: repoRootWithDefault,
  entry: optionalText('entry'),
  inDir: optionalText('in'),
  artifact: optionalText('artifact'),
  before: optionalText('before'),
  after: optionalText('after'),
  manifest: optionalText('manifest'),
  stateFile: optionalText('stateFile'),
  opsPath: optionalText('ops').pipe(Options.map((s) => (s ? s.trim() : s))),
  diagnosticsLevel: Options.choice('diagnosticsLevel', ['off', 'light', 'full'] as const).pipe(Options.withDefault('light')),
  maxEvents: positiveIntOptional('maxEvents'),
  timeoutMs: positiveIntOptional('timeout'),
  includeTrace: booleanWithNegation('includeTrace'),
  withAnchors: booleanWithNegation('withAnchors'),
  emit: trialRunEmitOption,
  config: configFlags,
  allowWarn: booleanWithNegation('allowWarn'),
  baselineDir: optionalText('baseline'),
  includeContextPack: booleanWithNegation('includeContextPack'),
  packMaxBytes: positiveIntOptional('packMaxBytes'),
  requireRulesManifest: booleanWithNegation('requireRulesManifest'),
  inputsFile: optionalText('inputs'),
  includeUiKitRegistry: booleanWithNegation('includeUiKitRegistry'),
  includeAnchorAutofill: booleanWithNegation('includeAnchorAutofill'),
  maxUsedServices: positiveIntOptional('maxUsedServices'),
  maxRawMode: positiveIntOptional('maxRawMode'),
  verifyLoopMode: optionalChoice<VerifyLoopMode>('verifyLoopMode', ['run', 'resume']),
  gateScope: optionalChoice<VerifyLoopGateScope>('gateScope', ['runtime', 'governance']),
  nextActionsEngine: optionalChoice<NextActionsEngine>('engine', ['bootstrap']),
  target: optionalText('target'),
  executor: optionalChoice<VerifyLoopExecutor>('executor', ['real', 'fixture']),
  emitNextActions: booleanWithNegation('emitNextActions'),
  emitNextActionsOut: optionalText('emitNextActionsOut'),
  instanceId: optionalText('instanceId'),
  maxAttempts: positiveIntOptional('maxAttempts'),
  previousRunId: optionalText('previousRunId'),
  previousReasonCode: optionalText('previousReasonCode'),
  report: optionalText('report'),
  dsl: optionalText('dsl'),
  strict: booleanWithNegation('strict'),
  describeJson: booleanWithNegation('json'),
})

const describeCommand = CommandDescriptor.make('describe', baseOptions).pipe(
  CommandDescriptor.mapEffect(({ options }) => {
    if (!options.describeJson) {
      return Effect.fail(ValidationError.invalidValue(HelpDoc.p('describe 仅支持机器可读输出，请显式提供 --json')))
    }
    return Effect.succeed({
      command: 'describe' as const,
      options,
      format: 'json' as const,
    })
  }),
)

const irExportCommand = CommandDescriptor.make('export', baseOptions).pipe(
  CommandDescriptor.mapEffect(({ options }) =>
    parseEntryRefFromOptions(options).pipe(
      Effect.map((entry) => ({ command: 'ir.export' as const, options, entry, withAnchors: options.withAnchors })),
    ),
  ),
)

const irValidateCommand = CommandDescriptor.make('validate', baseOptions).pipe(
  CommandDescriptor.mapEffect(({ options }) =>
    Effect.all({
      input: parseIrValidateInputFromOptions(options),
      profile: parseIrValidateProfileFromOptions(options),
    }).pipe(
      Effect.map(({ input, profile }) => ({
        command: 'ir.validate' as const,
        options,
        input,
        ...(profile ? { profile } : null),
      })),
    ),
  ),
)

const irDiffCommand = CommandDescriptor.make('diff', baseOptions).pipe(
  CommandDescriptor.mapEffect(({ options }) =>
    parseIrDiffInputFromOptions(options).pipe(
      Effect.map(({ before, after }) => ({ command: 'ir.diff' as const, options, before, after })),
    ),
  ),
)

const irCommand = CommandDescriptor.make('ir').pipe(
  CommandDescriptor.withSubcommands([
    ['export', irExportCommand],
    ['validate', irValidateCommand],
    ['diff', irDiffCommand],
  ] as const),
)

const extensionValidateCommand = CommandDescriptor.make('validate', baseOptions).pipe(
  CommandDescriptor.mapEffect(({ options }) =>
    parseManifestPathFromOptions(options).pipe(
      Effect.map((manifestPath) => ({ command: 'extension.validate' as const, options, manifestPath })),
    ),
  ),
)

const extensionLoadCommand = CommandDescriptor.make('load', baseOptions).pipe(
  CommandDescriptor.mapEffect(({ options }) =>
    Effect.all({
      manifestPath: parseManifestPathFromOptions(options),
      stateFile: parseStateFileFromOptions(options),
    }).pipe(
      Effect.map(({ manifestPath, stateFile }) => ({
        command: 'extension.load' as const,
        options,
        manifestPath,
        stateFile,
      })),
    ),
  ),
)

const extensionReloadCommand = CommandDescriptor.make('reload', baseOptions).pipe(
  CommandDescriptor.mapEffect(({ options }) =>
    parseStateFileFromOptions(options).pipe(
      Effect.map((stateFile) => ({
        command: 'extension.reload' as const,
        options,
        stateFile,
      })),
    ),
  ),
)

const extensionStatusCommand = CommandDescriptor.make('status', baseOptions).pipe(
  CommandDescriptor.mapEffect(({ options }) =>
    parseStateFileFromOptions(options).pipe(
      Effect.map((stateFile) => ({
        command: 'extension.status' as const,
        options,
        stateFile,
        json: options.describeJson,
      })),
    ),
  ),
)

const extensionCommand = CommandDescriptor.make('extension').pipe(
  CommandDescriptor.withSubcommands([
    ['validate', extensionValidateCommand],
    ['load', extensionLoadCommand],
    ['reload', extensionReloadCommand],
    ['status', extensionStatusCommand],
  ] as const),
)

const trialRunCommand = CommandDescriptor.make('trialrun', baseOptions).pipe(
  CommandDescriptor.mapEffect(({ options }) =>
    parseEntryRefFromOptions(options).pipe(
      Effect.map((entry) => ({
        command: 'trialrun' as const,
        options,
        entry,
        diagnosticsLevel: options.diagnosticsLevel,
        maxEvents: options.maxEvents,
        timeoutMs: options.timeoutMs,
        includeTrace: options.includeTrace,
        emit: options.emit,
        config: options.config,
      })),
    ),
  ),
)

const spyEvidenceCommand = CommandDescriptor.make('evidence', baseOptions).pipe(
  CommandDescriptor.mapEffect(({ options }) =>
    parseEntryRefFromOptions(options).pipe(
      Effect.map((entry) => ({
        command: 'spy.evidence' as const,
        options,
        entry,
        maxUsedServices: options.maxUsedServices,
        maxRawMode: options.maxRawMode,
        timeoutMs: options.timeoutMs,
      })),
    ),
  ),
)

const spyCommand = CommandDescriptor.make('spy').pipe(CommandDescriptor.withSubcommands([['evidence', spyEvidenceCommand]] as const))

const anchorIndexCommand = CommandDescriptor.make('index', baseOptions).pipe(
  CommandDescriptor.map(({ options }) => ({ command: 'anchor.index' as const, options, repoRoot: options.repoRoot })),
)

const anchorAutofillCommand = CommandDescriptor.make('autofill', baseOptions).pipe(
  CommandDescriptor.map(({ options }) => ({ command: 'anchor.autofill' as const, options, repoRoot: options.repoRoot })),
)

const anchorCommand = CommandDescriptor.make('anchor').pipe(
  CommandDescriptor.withSubcommands([
    ['index', anchorIndexCommand],
    ['autofill', anchorAutofillCommand],
  ] as const),
)

const transformModuleCommand = CommandDescriptor.make('module', baseOptions).pipe(
  CommandDescriptor.mapEffect(({ options }) => {
    const opsPath = typeof options.opsPath === 'string' && options.opsPath.length > 0 ? options.opsPath : undefined
    if (!opsPath) {
      return Effect.fail(ValidationError.missingFlag(HelpDoc.p('缺少输入：请提供 --ops <delta.json|->')))
    }
    return Effect.succeed({ command: 'transform.module' as const, options, repoRoot: options.repoRoot, opsPath })
  }),
)

const transformCommand = CommandDescriptor.make('transform').pipe(
  CommandDescriptor.withSubcommands([['module', transformModuleCommand]] as const),
)

const contractSuiteRunCommand = CommandDescriptor.make('run', baseOptions).pipe(
  CommandDescriptor.mapEffect(({ options }) =>
    parseEntryRefFromOptions(options).pipe(
      Effect.map((entry) => ({
        command: 'contract-suite.run' as const,
        options,
        entry,
        diagnosticsLevel: options.diagnosticsLevel,
        maxEvents: options.maxEvents,
        timeoutMs: options.timeoutMs,
        includeTrace: options.includeTrace,
        config: options.config,
        allowWarn: options.allowWarn,
        baselineDir: options.baselineDir,
        includeContextPack: options.includeContextPack,
        packMaxBytes: options.packMaxBytes,
        requireRulesManifest: options.requireRulesManifest,
        inputsFile: options.inputsFile,
        includeUiKitRegistry: options.includeUiKitRegistry,
        includeAnchorAutofill: options.includeAnchorAutofill,
        repoRoot: options.repoRoot,
      })),
    ),
  ),
)

const contractSuiteCommand = CommandDescriptor.make('contract-suite').pipe(
  CommandDescriptor.withSubcommands([['run', contractSuiteRunCommand]] as const),
)

const verifyLoopCommand = CommandDescriptor.make('verify-loop', baseOptions).pipe(
  CommandDescriptor.mapEffect(({ options }) =>
    parseVerifyLoopInputFromOptions(options).pipe(
      Effect.map(({ mode, gateScope, target, executor, emitNextActions, instanceId, maxAttempts, previousRunId, previousReasonCode }) => ({
        command: 'verify-loop' as const,
        options,
        mode,
        gateScope,
        target,
        ...(executor ? { executor } : null),
        emitNextActions,
        ...(options.emitNextActionsOut ? { emitNextActionsOut: options.emitNextActionsOut } : null),
        ...(instanceId ? { instanceId } : null),
        ...(typeof maxAttempts === 'number' ? { maxAttempts } : null),
        ...(previousRunId ? { previousRunId } : null),
        ...(previousReasonCode ? { previousReasonCode } : null),
      })),
    ),
  ),
)

const nextActionsExecCommand = CommandDescriptor.make('exec', baseOptions).pipe(
  CommandDescriptor.mapEffect(({ options }) =>
    parseNextActionsExecInputFromOptions(options).pipe(
      Effect.map(({ reportPath, engine, strict }) => ({
        command: 'next-actions.exec' as const,
        options,
        reportPath,
        engine,
        strict,
      })),
    ),
  ),
)

const nextActionsCommand = CommandDescriptor.make('next-actions').pipe(
  CommandDescriptor.withSubcommands([['exec', nextActionsExecCommand]] as const),
)

const rootCommand = CommandDescriptor.make('logix').pipe(
  CommandDescriptor.withSubcommands([
    ['describe', describeCommand],
    ['ir', irCommand],
    ['extension', extensionCommand],
    ['trialrun', trialRunCommand],
    ['contract-suite', contractSuiteCommand],
    ['verify-loop', verifyLoopCommand],
    ['next-actions', nextActionsCommand],
    ['spy', spyCommand],
    ['anchor', anchorCommand],
    ['transform', transformCommand],
  ] as const),
)

const isLeafParsed = (value: unknown): value is LeafParsed =>
  Boolean(value) &&
  typeof value === 'object' &&
  'command' in (value as any) &&
  typeof (value as any).command === 'string'

const unwrapToLeaf = (value: unknown): LeafParsed | undefined => {
  if (isLeafParsed(value)) return value
  if (value && typeof value === 'object' && 'subcommand' in (value as any)) {
    const sub = (value as any).subcommand as FxOption.Option<any>
    if (FxOption.isNone(sub)) return undefined
    const inner = sub.value
    if (Array.isArray(inner) && inner.length >= 2) {
      return unwrapToLeaf(inner[1])
    }
    return unwrapToLeaf(inner)
  }
  return undefined
}

const booleanOptionNames = new Set([
  'allowWarn',
  'includeAnchorAutofill',
  'includeContextPack',
  'includeTrace',
  'includeUiKitRegistry',
  'json',
  'emitNextActions',
  'strict',
  'requireRulesManifest',
  'withAnchors',
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
  '--engine',
  '--entry',
  '--executor',
  '--emit',
  '--emitNextActionsOut',
  '--gateScope',
  '--host',
  '--instanceId',
  '--in',
  '--inputs',
  '--manifest',
  '--maxAttempts',
  '--maxEvents',
  '--maxRawMode',
  '--maxUsedServices',
  '--mode',
  '--ops',
  '--out',
  '--outRoot',
  '--dsl',
  '--packMaxBytes',
  '--profile',
  '--report',
  '--previousRunId',
  '--previousReasonCode',
  '--repoRoot',
  '--runId',
  '--stateFile',
  '--target',
  '--timeout',
  '--tsconfig',
  '--verifyLoopMode',
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
  ['extension', 'validate'],
  ['extension', 'load'],
  ['extension', 'reload'],
  ['extension', 'status'],
  ['contract-suite', 'run'],
  ['verify-loop'],
  ['next-actions', 'exec'],
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
  if (extracted.tokens[0] === 'verify-loop') {
    const rewritten: string[] = []
    for (let i = 0; i < rest.length; i += 1) {
      const token = rest[i]!
      if (token === '--mode') {
        rewritten.push('--verifyLoopMode')
        continue
      }
      if (token === '--emitNextActions') {
        const next = rest[i + 1]
        if (typeof next === 'string' && !next.startsWith('-')) {
          rewritten.push('--emitNextActionsOut', next, '--emitNextActions')
          i += 1
          continue
        }
      }
      rewritten.push(token)
    }
    return [...extracted.tokens, ...dedupeOptionTokensLastWins(rewritten)]
  }
  return [...extracted.tokens, ...dedupeOptionTokensLastWins(rest)]
}

const normalizeFlagAlias = (token: string): string => {
  if (token === '--with-anchors') return '--withAnchors'
  if (token === '--no-with-anchors') return '--noWithAnchors'
  return token
}

const ANSI_CSI_REGEX = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')

const renderValidationError = (err: ValidationError.ValidationError): string => {
  try {
    return HelpDoc.toAnsiText(err.error).replace(ANSI_CSI_REGEX, '').trim()
  } catch {
    return `${err._tag}`
  }
}

export const parseCliInvocation = (
  argv: ReadonlyArray<string>,
  options: { readonly helpText: string },
): Effect.Effect<CliHelpResult | CliInvocation, unknown> => {
  if (argv.includes('-h') || argv.includes('--help') || argv.length === 0) {
    return Effect.succeed(({ kind: 'help', text: options.helpText } as const satisfies CliHelpResult))
  }

  const normalized = normalizeArgvForEffectCli(argv.map(normalizeFlagAlias))

  return CommandDescriptor.parse(rootCommand, ['logix', ...normalized], CliConfig.defaultConfig).pipe(
    Effect.provide(NodeContext.layer),
    Effect.flatMap((directive): Effect.Effect<CliHelpResult | CliInvocation, unknown> => {
      if (CommandDirective.isBuiltIn(directive)) {
        return Effect.succeed(({ kind: 'help', text: options.helpText } as const satisfies CliHelpResult))
      }

      if (directive.leftover.length > 0) {
        return Effect.fail(
          makeCliError({
            code: 'CLI_INVALID_ARGUMENT',
            message: `未知参数：${directive.leftover[0]}`,
            hint: options.helpText,
          }),
        )
      }

      const rootValue = directive.value as any
      const leaf = unwrapToLeaf(rootValue)
      if (!leaf) {
        return Effect.fail(
          makeCliError({
            code: 'CLI_INVALID_COMMAND',
            message: '缺少命令：请提供 <group> <subcommand>（或 trialrun）',
            hint: options.helpText,
          }),
        )
      }

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
          return Effect.succeed(
            ({ kind: 'command', command: 'ir.export', global, entry: leaf.entry, withAnchors: leaf.withAnchors } as const),
          )
        case 'ir.validate':
          return Effect.succeed(
            ({
              kind: 'command',
              command: 'ir.validate',
              global,
              input: leaf.input,
              ...(leaf.profile ? { profile: leaf.profile } : null),
            } as const),
          )
        case 'ir.diff':
          return Effect.succeed(({ kind: 'command', command: 'ir.diff', global, before: leaf.before, after: leaf.after } as const))
        case 'extension.validate':
          return Effect.succeed({
            kind: 'command',
            command: 'extension.validate',
            global,
            manifestPath: leaf.manifestPath,
          } as const)
        case 'extension.load':
          return Effect.succeed({
            kind: 'command',
            command: 'extension.load',
            global,
            manifestPath: leaf.manifestPath,
            stateFile: leaf.stateFile,
          } as const)
        case 'extension.reload':
          return Effect.succeed({
            kind: 'command',
            command: 'extension.reload',
            global,
            stateFile: leaf.stateFile,
          } as const)
        case 'extension.status':
          return Effect.succeed({
            kind: 'command',
            command: 'extension.status',
            global,
            stateFile: leaf.stateFile,
            json: leaf.json,
          } as const)
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
            emit: leaf.emit,
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
        case 'verify-loop':
          return Effect.succeed({
            kind: 'command',
            command: 'verify-loop',
            global,
            mode: leaf.mode,
            gateScope: leaf.gateScope,
            target: leaf.target,
            ...(leaf.executor ? { executor: leaf.executor } : null),
            emitNextActions: leaf.emitNextActions,
            ...(leaf.emitNextActionsOut ? { emitNextActionsOut: leaf.emitNextActionsOut } : null),
            ...(leaf.instanceId ? { instanceId: leaf.instanceId } : null),
            ...(typeof leaf.maxAttempts === 'number' ? { maxAttempts: leaf.maxAttempts } : null),
            ...(leaf.previousRunId ? { previousRunId: leaf.previousRunId } : null),
            ...(leaf.previousReasonCode ? { previousReasonCode: leaf.previousReasonCode } : null),
          } as const)
        case 'next-actions.exec':
          return Effect.succeed({
            kind: 'command',
            command: 'next-actions.exec',
            global,
            reportPath: leaf.reportPath,
            engine: leaf.engine,
            strict: leaf.strict,
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
    Effect.catchAll((cause) => {
      if (ValidationError.isValidationError(cause)) {
        return Effect.fail(
          makeCliError({
            code: 'CLI_INVALID_ARGUMENT',
            message: renderValidationError(cause),
            hint: options.helpText,
            cause,
          }),
        )
      }
      return Effect.fail(cause)
    }),
  )
}
