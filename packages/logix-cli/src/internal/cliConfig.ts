import { Effect } from 'effect'
import fs from 'node:fs/promises'
import path from 'node:path'

import { asSerializableErrorSummary, makeCliError } from './errors.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

const asPositiveInt = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.floor(n)
}

const capitalize = (s: string): string => (s.length === 0 ? s : `${s[0]!.toUpperCase()}${s.slice(1)}`)

export type CliProfileDefaults = {
  readonly outRoot?: string
  readonly repoRoot?: string
  readonly tsconfig?: string
  readonly host?: 'node' | 'browser-mock'
  readonly budgetBytes?: number
  readonly diagnosticsLevel?: 'off' | 'light' | 'full'
  readonly maxEvents?: number
  readonly timeout?: number
  readonly baseline?: string
  readonly inputs?: string
  readonly packMaxBytes?: number
  readonly allowWarn?: boolean
  readonly includeTrace?: boolean
  readonly includeContextPack?: boolean
  readonly includeUiKitRegistry?: boolean
  readonly requireRulesManifest?: boolean
  readonly includeAnchorAutofill?: boolean
  readonly entry?: string
}

export type LogixCliConfigFile = {
  readonly schemaVersion: 1
  readonly defaults?: CliProfileDefaults
  readonly profiles?: Readonly<Record<string, CliProfileDefaults>>
}

export type CliConfigDiscovery =
  | { readonly found: false }
  | { readonly found: true; readonly path: string; readonly ok: true; readonly config: LogixCliConfigFile; readonly profiles: ReadonlyArray<string> }
  | { readonly found: true; readonly path: string; readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

const readJsonFile = (filePath: string): Effect.Effect<unknown, unknown> =>
  Effect.tryPromise({
    try: async () => JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown,
    catch: (cause) =>
      makeCliError({
        code: 'CLI_INVALID_INPUT',
        message: `[Logix][CLI] 无法读取/解析配置文件：${filePath}`,
        cause,
      }),
  })

const statExists = (filePath: string): Effect.Effect<boolean, never> =>
  Effect.tryPromise({
    try: async () => {
      await fs.stat(filePath)
      return true
    },
    catch: (cause) => cause,
  }).pipe(Effect.catchAll(() => Effect.succeed(false)))

const findUp = (startDir: string, fileName: string): Effect.Effect<string | undefined, never> =>
  Effect.gen(function* () {
    let dir = path.resolve(startDir)
    while (true) {
      const candidate = path.join(dir, fileName)
      if (yield* statExists(candidate)) return candidate
      const parent = path.dirname(dir)
      if (parent === dir) return undefined
      dir = parent
    }
  })

const getFlag = (argv: ReadonlyArray<string>, name: string): string | undefined => {
  const idx = argv.lastIndexOf(`--${name}`)
  if (idx < 0) return undefined
  const next = argv[idx + 1]
  if (!next || next.startsWith('--')) {
    throw makeCliError({ code: 'CLI_INVALID_ARGUMENT', message: `--${name} 缺少参数` })
  }
  return next
}

const parseCliConfigPath = (argv: ReadonlyArray<string>): string | undefined => getFlag(argv, 'cliConfig') ?? undefined

const parseProfile = (argv: ReadonlyArray<string>): string | undefined => {
  const raw = getFlag(argv, 'profile')
  return asNonEmptyString(raw)
}

const validateDefaults = (input: unknown, label: string): CliProfileDefaults => {
  if (!isRecord(input)) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label} 必须是对象` })
  }

  const knownKeys = new Set([
    'outRoot',
    'repoRoot',
    'tsconfig',
    'host',
    'budgetBytes',
    'diagnosticsLevel',
    'maxEvents',
    'timeout',
    'baseline',
    'inputs',
    'packMaxBytes',
    'allowWarn',
    'includeTrace',
    'includeContextPack',
    'includeUiKitRegistry',
    'requireRulesManifest',
    'includeAnchorAutofill',
    'entry',
  ])

  for (const key of Object.keys(input)) {
    if (!knownKeys.has(key)) {
      throw makeCliError({
        code: 'CLI_INVALID_INPUT',
        message: `[Logix][CLI] ${label} 包含未知字段：${key}`,
        hint: '请更新配置文件或升级 CLI；配置 schemaVersion=1 不允许未知字段。',
      })
    }
  }

  const diagnosticsLevel = (input as any).diagnosticsLevel
  if (
    diagnosticsLevel !== undefined &&
    diagnosticsLevel !== 'off' &&
    diagnosticsLevel !== 'light' &&
    diagnosticsLevel !== 'full'
  ) {
    throw makeCliError({
      code: 'CLI_INVALID_INPUT',
      message: `[Logix][CLI] ${label}.diagnosticsLevel 非法：${String(diagnosticsLevel)}（期望 off|light|full）`,
    })
  }

  const allowWarn = (input as any).allowWarn
  if (allowWarn !== undefined && typeof allowWarn !== 'boolean') {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.allowWarn 必须是 boolean` })
  }

  const includeTrace = (input as any).includeTrace
  if (includeTrace !== undefined && typeof includeTrace !== 'boolean') {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.includeTrace 必须是 boolean` })
  }

  const includeContextPack = (input as any).includeContextPack
  if (includeContextPack !== undefined && typeof includeContextPack !== 'boolean') {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.includeContextPack 必须是 boolean` })
  }

  const includeUiKitRegistry = (input as any).includeUiKitRegistry
  if (includeUiKitRegistry !== undefined && typeof includeUiKitRegistry !== 'boolean') {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.includeUiKitRegistry 必须是 boolean` })
  }

  const requireRulesManifest = (input as any).requireRulesManifest
  if (requireRulesManifest !== undefined && typeof requireRulesManifest !== 'boolean') {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.requireRulesManifest 必须是 boolean` })
  }

  const includeAnchorAutofill = (input as any).includeAnchorAutofill
  if (includeAnchorAutofill !== undefined && typeof includeAnchorAutofill !== 'boolean') {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.includeAnchorAutofill 必须是 boolean` })
  }

  const budgetBytes = (input as any).budgetBytes
  if (budgetBytes !== undefined && asPositiveInt(budgetBytes) === undefined) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.budgetBytes 必须是正整数` })
  }

  const maxEvents = (input as any).maxEvents
  if (maxEvents !== undefined && asPositiveInt(maxEvents) === undefined) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.maxEvents 必须是正整数` })
  }

  const timeout = (input as any).timeout
  if (timeout !== undefined && asPositiveInt(timeout) === undefined) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.timeout 必须是正整数（ms）` })
  }

  const packMaxBytes = (input as any).packMaxBytes
  if (packMaxBytes !== undefined && asPositiveInt(packMaxBytes) === undefined) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.packMaxBytes 必须是正整数（bytes）` })
  }

  const outRoot = (input as any).outRoot
  if (outRoot !== undefined && asNonEmptyString(outRoot) === undefined) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.outRoot 必须是非空字符串` })
  }

  const repoRoot = (input as any).repoRoot
  if (repoRoot !== undefined && asNonEmptyString(repoRoot) === undefined) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.repoRoot 必须是非空字符串` })
  }

  const tsconfig = (input as any).tsconfig
  if (tsconfig !== undefined && asNonEmptyString(tsconfig) === undefined) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.tsconfig 必须是非空字符串` })
  }

  const host = (input as any).host
  if (host !== undefined && host !== 'node' && host !== 'browser-mock') {
    throw makeCliError({
      code: 'CLI_INVALID_INPUT',
      message: `[Logix][CLI] ${label}.host 非法：${String(host)}（期望 node|browser-mock）`,
    })
  }

  const baseline = (input as any).baseline
  if (baseline !== undefined && asNonEmptyString(baseline) === undefined) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.baseline 必须是非空字符串` })
  }

  const inputs = (input as any).inputs
  if (inputs !== undefined && asNonEmptyString(inputs) === undefined) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.inputs 必须是非空字符串` })
  }

  const entry = (input as any).entry
  if (entry !== undefined && asNonEmptyString(entry) === undefined) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] ${label}.entry 必须是非空字符串` })
  }

  return {
    ...(outRoot !== undefined ? { outRoot: asNonEmptyString(outRoot) } : null),
    ...(repoRoot !== undefined ? { repoRoot: asNonEmptyString(repoRoot) } : null),
    ...(tsconfig !== undefined ? { tsconfig: asNonEmptyString(tsconfig) } : null),
    ...(host !== undefined ? { host } : null),
    ...(budgetBytes !== undefined ? { budgetBytes: asPositiveInt(budgetBytes) } : null),
    ...(diagnosticsLevel !== undefined ? { diagnosticsLevel } : null),
    ...(maxEvents !== undefined ? { maxEvents: asPositiveInt(maxEvents) } : null),
    ...(timeout !== undefined ? { timeout: asPositiveInt(timeout) } : null),
    ...(baseline !== undefined ? { baseline: asNonEmptyString(baseline) } : null),
    ...(inputs !== undefined ? { inputs: asNonEmptyString(inputs) } : null),
    ...(packMaxBytes !== undefined ? { packMaxBytes: asPositiveInt(packMaxBytes) } : null),
    ...(allowWarn !== undefined ? { allowWarn } : null),
    ...(includeTrace !== undefined ? { includeTrace } : null),
    ...(includeContextPack !== undefined ? { includeContextPack } : null),
    ...(includeUiKitRegistry !== undefined ? { includeUiKitRegistry } : null),
    ...(requireRulesManifest !== undefined ? { requireRulesManifest } : null),
    ...(includeAnchorAutofill !== undefined ? { includeAnchorAutofill } : null),
    ...(entry !== undefined ? { entry: asNonEmptyString(entry) } : null),
  }
}

const validateConfigFile = (input: unknown, filePath: string): LogixCliConfigFile => {
  if (!isRecord(input)) {
    throw makeCliError({ code: 'CLI_INVALID_INPUT', message: `[Logix][CLI] 配置文件必须是 JSON object：${filePath}` })
  }
  const schemaVersion = (input as any).schemaVersion
  if (schemaVersion !== 1) {
    throw makeCliError({
      code: 'CLI_INVALID_INPUT',
      message: `[Logix][CLI] 配置文件 schemaVersion 非法：${String(schemaVersion)}（期望 1）`,
    })
  }

  const defaultsRaw = (input as any).defaults
  const profilesRaw = (input as any).profiles

  const defaults = defaultsRaw !== undefined ? validateDefaults(defaultsRaw, 'defaults') : undefined

  let profiles: Record<string, CliProfileDefaults> | undefined
  if (profilesRaw !== undefined) {
    if (!isRecord(profilesRaw)) {
      throw makeCliError({ code: 'CLI_INVALID_INPUT', message: '[Logix][CLI] profiles 必须是对象（Record<string, defaults>）' })
    }
    profiles = {}
    for (const [name, raw] of Object.entries(profilesRaw)) {
      const key = asNonEmptyString(name)
      if (!key) continue
      profiles[key] = validateDefaults(raw, `profiles.${key}`)
    }
  }

  return {
    schemaVersion: 1,
    ...(defaults ? { defaults } : null),
    ...(profiles ? { profiles } : null),
  }
}

const toArgvPrefix = (defaults: CliProfileDefaults): ReadonlyArray<string> => {
  const tokens: string[] = []

  if (defaults.outRoot) tokens.push('--outRoot', defaults.outRoot)
  if (defaults.repoRoot) tokens.push('--repoRoot', defaults.repoRoot)
  if (defaults.tsconfig) tokens.push('--tsconfig', defaults.tsconfig)
  if (defaults.host) tokens.push('--host', defaults.host)
  if (defaults.budgetBytes) tokens.push('--budgetBytes', String(defaults.budgetBytes))
  if (defaults.diagnosticsLevel) tokens.push('--diagnosticsLevel', defaults.diagnosticsLevel)
  if (defaults.maxEvents) tokens.push('--maxEvents', String(defaults.maxEvents))
  if (defaults.timeout) tokens.push('--timeout', String(defaults.timeout))
  if (defaults.baseline) tokens.push('--baseline', defaults.baseline)
  if (defaults.inputs) tokens.push('--inputs', defaults.inputs)
  if (defaults.packMaxBytes) tokens.push('--packMaxBytes', String(defaults.packMaxBytes))
  if (defaults.entry) tokens.push('--entry', defaults.entry)

  const bool = (key: keyof CliProfileDefaults, flag: string): void => {
    const value = defaults[key]
    if (value === true) tokens.push(`--${flag}`)
    if (value === false) tokens.push(`--no${capitalize(flag)}`)
  }

  bool('allowWarn', 'allowWarn')
  bool('includeTrace', 'includeTrace')
  bool('includeContextPack', 'includeContextPack')
  bool('includeUiKitRegistry', 'includeUiKitRegistry')
  bool('requireRulesManifest', 'requireRulesManifest')
  bool('includeAnchorAutofill', 'includeAnchorAutofill')

  return tokens
}

export const resolveCliConfigArgvPrefix = (argv: ReadonlyArray<string>): Effect.Effect<ReadonlyArray<string>, unknown> =>
  Effect.gen(function* () {
    const explicitPathRaw = parseCliConfigPath(argv)
    const profile = parseProfile(argv)

    const configPath = explicitPathRaw
      ? path.resolve(process.cwd(), explicitPathRaw)
      : yield* findUp(process.cwd(), 'logix.cli.json')

    if (!configPath) {
      if (profile) {
        throw makeCliError({
          code: 'CLI_INVALID_INPUT',
          message: `[Logix][CLI] 未找到配置文件，但指定了 --profile ${profile}`,
          hint: '请在当前目录或上层目录放置 logix.cli.json，或使用 --cliConfig <path> 指定。',
        })
      }
      return []
    }

    if (explicitPathRaw && !(yield* statExists(configPath))) {
      throw makeCliError({
        code: 'CLI_INVALID_INPUT',
        message: `[Logix][CLI] 指定的配置文件不存在：${explicitPathRaw}`,
      })
    }

    const raw = yield* readJsonFile(configPath)
    const config = validateConfigFile(raw, configPath)

    const tokens: string[] = []
    if (config.defaults) tokens.push(...toArgvPrefix(config.defaults))

    if (profile) {
      const profileDefaults = config.profiles?.[profile]
      if (!profileDefaults) {
        throw makeCliError({
          code: 'CLI_INVALID_INPUT',
          message: `[Logix][CLI] 未找到 profile：${profile}`,
        })
      }
      tokens.push(...toArgvPrefix(profileDefaults))
    }

    return tokens
  })

export const discoverCliConfig = (args: {
  readonly cwd: string
  readonly cliConfigPath?: string
}): Effect.Effect<CliConfigDiscovery, never> => {
  return Effect.gen(function* () {
    const explicit = asNonEmptyString(args.cliConfigPath)
    const discoveredPath = explicit ? path.resolve(args.cwd, explicit) : yield* findUp(args.cwd, 'logix.cli.json')

    if (!discoveredPath) return { found: false } as const

    if (explicit && !(yield* statExists(discoveredPath))) {
      return {
        found: true,
        path: discoveredPath,
        ok: false,
        error: { code: 'CLI_CONFIG_INVALID', message: `cli config not found: ${explicit}` },
      } as const
    }

    return yield* Effect.gen(function* () {
      const raw = yield* readJsonFile(discoveredPath)
      const config = yield* Effect.try({
        try: () => validateConfigFile(raw, discoveredPath),
        catch: (cause) => cause,
      })
      const profiles = Object.keys(config.profiles ?? {}).sort()
      return { found: true, path: discoveredPath, ok: true, config, profiles } as const
    }).pipe(
      Effect.catchAll((cause) => {
        const summary = asSerializableErrorSummary(cause)
        const code = summary.message.includes('.entry') ? 'CLI_ENTRY_INVALID' : 'CLI_CONFIG_INVALID'
        const out: CliConfigDiscovery = {
          found: true,
          path: discoveredPath,
          ok: false,
          error: { code, message: summary.message },
        }
        return Effect.succeed(out)
      }),
    )
  })
}
