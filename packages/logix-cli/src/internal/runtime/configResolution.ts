import { Effect } from 'effect'

import type { CliConfigArgvPrefixResolution } from '../cliConfig.js'
import { resolveCliConfigArgvPrefixResolution } from '../cliConfig.js'
import { makeCliError } from '../errors.js'

export type ConfigLayerSource = 'defaults' | 'profile' | 'env' | 'argv'

export type ConfigTraceStep = {
  readonly source: ConfigLayerSource
  readonly value: string
  readonly via?: string
}

export type ConfigEffectiveItem = {
  readonly option: `--${string}`
  readonly value: string
  readonly source: ConfigLayerSource
}

export type ConfigOverrideTrailItem = {
  readonly option: `--${string}`
  readonly applied: ReadonlyArray<ConfigTraceStep>
  readonly finalSource: ConfigLayerSource
  readonly finalValue: string
}

export type ConfigResolutionTrace = {
  readonly precedence: readonly ['defaults', 'profile', 'env', 'argv']
  readonly effective: ReadonlyArray<ConfigEffectiveItem>
  readonly overrideTrail: ReadonlyArray<ConfigOverrideTrailItem>
}

export type EnvConfigBinding = {
  readonly env: string
  readonly option: `--${string}`
  readonly value: string
}

export type EnvConfigLayer = {
  readonly source: 'env'
  readonly tokens: ReadonlyArray<string>
  readonly bindings: ReadonlyArray<EnvConfigBinding>
}

export type RuntimeConfigResolution = {
  readonly argvWithConfigPrefix: ReadonlyArray<string>
  readonly cliConfig: CliConfigArgvPrefixResolution
  readonly envLayer: EnvConfigLayer
  readonly trace: ConfigResolutionTrace
}

export type RuntimeConfigResolveOptions = {
  readonly env?: NodeJS.ProcessEnv
}

type ParsedAssignment = {
  readonly option: `--${string}`
  readonly value: string
  readonly source: ConfigLayerSource
  readonly via?: string
}

type EnvRule =
  | {
      readonly env: string
      readonly option: `--${string}`
      readonly kind: 'string'
    }
  | {
      readonly env: string
      readonly option: `--${string}`
      readonly kind: 'positiveInt'
    }
  | {
      readonly env: string
      readonly option: `--${string}`
      readonly kind: 'enum'
      readonly values: ReadonlyArray<string>
    }
  | {
      readonly env: string
      readonly option: `--${string}`
      readonly kind: 'boolean'
    }

const FLAGS_WITH_VALUE = new Set<string>([
  '--after',
  '--artifact',
  '--baseline',
  '--before',
  '--budgetBytes',
  '--cliConfig',
  '--config',
  '--diagnosticsLevel',
  '--entry',
  '--gateScope',
  '--host',
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
  '--packMaxBytes',
  '--profile',
  '--previousRunId',
  '--repoRoot',
  '--runId',
  '--stateFile',
  '--target',
  '--timeout',
  '--tsconfig',
  '--verifyLoopMode',
])

const ENV_RULES: ReadonlyArray<EnvRule> = [
  { env: 'LOGIX_CLI_OUT_ROOT', option: '--outRoot', kind: 'string' },
  { env: 'LOGIX_CLI_REPO_ROOT', option: '--repoRoot', kind: 'string' },
  { env: 'LOGIX_CLI_TSCONFIG', option: '--tsconfig', kind: 'string' },
  { env: 'LOGIX_CLI_HOST', option: '--host', kind: 'enum', values: ['node', 'browser-mock'] },
  { env: 'LOGIX_CLI_BUDGET_BYTES', option: '--budgetBytes', kind: 'positiveInt' },
  { env: 'LOGIX_CLI_DIAGNOSTICS_LEVEL', option: '--diagnosticsLevel', kind: 'enum', values: ['off', 'light', 'full'] },
  { env: 'LOGIX_CLI_MAX_EVENTS', option: '--maxEvents', kind: 'positiveInt' },
  { env: 'LOGIX_CLI_TIMEOUT', option: '--timeout', kind: 'positiveInt' },
  { env: 'LOGIX_CLI_BASELINE', option: '--baseline', kind: 'string' },
  { env: 'LOGIX_CLI_INPUTS', option: '--inputs', kind: 'string' },
  { env: 'LOGIX_CLI_PACK_MAX_BYTES', option: '--packMaxBytes', kind: 'positiveInt' },
  { env: 'LOGIX_CLI_ENTRY', option: '--entry', kind: 'string' },
  { env: 'LOGIX_CLI_ALLOW_WARN', option: '--allowWarn', kind: 'boolean' },
  { env: 'LOGIX_CLI_INCLUDE_TRACE', option: '--includeTrace', kind: 'boolean' },
  { env: 'LOGIX_CLI_INCLUDE_CONTEXT_PACK', option: '--includeContextPack', kind: 'boolean' },
  { env: 'LOGIX_CLI_INCLUDE_UI_KIT_REGISTRY', option: '--includeUiKitRegistry', kind: 'boolean' },
  { env: 'LOGIX_CLI_REQUIRE_RULES_MANIFEST', option: '--requireRulesManifest', kind: 'boolean' },
  { env: 'LOGIX_CLI_INCLUDE_ANCHOR_AUTOFILL', option: '--includeAnchorAutofill', kind: 'boolean' },
]

const EMPTY_CLI_CONFIG_RESOLUTION: CliConfigArgvPrefixResolution = {
  prefix: [],
  layers: [],
  discovery: { found: false },
}

const asNonEmpty = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const parsePositiveIntEnv = (envName: string, value: string): string => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw makeCliError({
      code: 'CLI_INVALID_ARGUMENT',
      message: `[Logix][CLI] 环境变量 ${envName} 必须是正整数`,
    })
  }
  return String(parsed)
}

const parseEnumEnv = (envName: string, value: string, values: ReadonlyArray<string>): string => {
  if (!values.includes(value)) {
    throw makeCliError({
      code: 'CLI_INVALID_ARGUMENT',
      message: `[Logix][CLI] 环境变量 ${envName} 非法：${value}（期望 ${values.join('|')}）`,
    })
  }
  return value
}

const parseBooleanEnv = (envName: string, value: string): boolean => {
  const normalized = value.toLowerCase()
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') return false
  throw makeCliError({
    code: 'CLI_INVALID_ARGUMENT',
    message: `[Logix][CLI] 环境变量 ${envName} 必须是布尔值（1/0/true/false/yes/no/on/off）`,
  })
}

const toNegatedBooleanFlag = (option: `--${string}`): `--${string}` => {
  const raw = option.slice(2)
  const negated = `--no${raw[0]!.toUpperCase()}${raw.slice(1)}`
  return negated as `--${string}`
}

const buildEnvLayer = (env: NodeJS.ProcessEnv): EnvConfigLayer => {
  const tokens: string[] = []
  const bindings: EnvConfigBinding[] = []

  for (const rule of ENV_RULES) {
    const raw = asNonEmpty(env[rule.env])
    if (!raw) continue

    if (rule.kind === 'boolean') {
      const boolValue = parseBooleanEnv(rule.env, raw)
      const token = boolValue ? rule.option : toNegatedBooleanFlag(rule.option)
      tokens.push(token)
      bindings.push({
        env: rule.env,
        option: rule.option,
        value: boolValue ? 'true' : 'false',
      })
      continue
    }

    const value =
      rule.kind === 'positiveInt'
        ? parsePositiveIntEnv(rule.env, raw)
        : rule.kind === 'enum'
          ? parseEnumEnv(rule.env, raw, rule.values)
          : raw
    tokens.push(rule.option, value)
    bindings.push({
      env: rule.env,
      option: rule.option,
      value,
    })
  }

  return {
    source: 'env',
    tokens,
    bindings,
  }
}

const splitInlineAssignment = (token: string): { readonly flag: string; readonly value?: string } => {
  const eq = token.indexOf('=')
  if (eq <= 2 || !token.startsWith('--')) return { flag: token }
  return {
    flag: token.slice(0, eq),
    value: token.slice(eq + 1),
  }
}

const canonicalBooleanOption = (flag: string): { readonly option: `--${string}`; readonly negated: boolean } | undefined => {
  if (!flag.startsWith('--')) return undefined
  if (flag.startsWith('--no') && flag.length > 4) {
    const candidate = flag.slice(4)
    if (candidate.length > 0 && candidate[0] === candidate[0]!.toUpperCase()) {
      const canonical = `--${candidate[0]!.toLowerCase()}${candidate.slice(1)}`
      return {
        option: canonical as `--${string}`,
        negated: true,
      }
    }
  }
  return {
    option: flag as `--${string}`,
    negated: false,
  }
}

const parseAssignmentsFromTokens = (args: {
  readonly tokens: ReadonlyArray<string>
  readonly source: ConfigLayerSource
  readonly via?: string
}): ReadonlyArray<ParsedAssignment> => {
  const out: ParsedAssignment[] = []
  for (let index = 0; index < args.tokens.length; index++) {
    const current = args.tokens[index]!
    if (!current.startsWith('--')) continue

    const split = splitInlineAssignment(current)
    const optionInfo = canonicalBooleanOption(split.flag)
    if (!optionInfo) continue

    if (split.value !== undefined) {
      out.push({
        option: optionInfo.option,
        value: split.value,
        source: args.source,
        ...(args.via ? { via: args.via } : null),
      })
      continue
    }

    if (optionInfo.negated) {
      out.push({
        option: optionInfo.option,
        value: 'false',
        source: args.source,
        ...(args.via ? { via: args.via } : null),
      })
      continue
    }

    if (FLAGS_WITH_VALUE.has(split.flag)) {
      const next = args.tokens[index + 1]
      if (next !== undefined && (!next.startsWith('--') || next === '-')) {
        out.push({
          option: optionInfo.option,
          value: next,
          source: args.source,
          ...(args.via ? { via: args.via } : null),
        })
        index += 1
      }
      continue
    }

    out.push({
      option: optionInfo.option,
      value: 'true',
      source: args.source,
      ...(args.via ? { via: args.via } : null),
    })
  }
  return out
}

const buildConfigTrace = (args: {
  readonly argv: ReadonlyArray<string>
  readonly cliConfig: CliConfigArgvPrefixResolution
  readonly envLayer: EnvConfigLayer
}): ConfigResolutionTrace => {
  const assignments: ParsedAssignment[] = []

  for (const layer of args.cliConfig.layers) {
    if (layer.source === 'profile') {
      assignments.push(
        ...parseAssignmentsFromTokens({
          tokens: layer.tokens,
          source: 'profile',
          via: layer.profile,
        }),
      )
      continue
    }
    assignments.push(
      ...parseAssignmentsFromTokens({
        tokens: layer.tokens,
        source: 'defaults',
      }),
    )
  }

  for (const binding of args.envLayer.bindings) {
    assignments.push({
      option: binding.option,
      value: binding.value,
      source: 'env',
      via: binding.env,
    })
  }

  assignments.push(
    ...parseAssignmentsFromTokens({
      tokens: args.argv,
      source: 'argv',
    }),
  )

  const trails = new Map<`--${string}`, ConfigTraceStep[]>()
  for (const assignment of assignments) {
    const previous = trails.get(assignment.option) ?? []
    previous.push({
      source: assignment.source,
      value: assignment.value,
      ...(assignment.via ? { via: assignment.via } : null),
    })
    trails.set(assignment.option, previous)
  }

  const sortedOptions = Array.from(trails.keys()).sort()

  const effective: ConfigEffectiveItem[] = []
  const overrideTrail: ConfigOverrideTrailItem[] = []
  for (const option of sortedOptions) {
    const applied = trails.get(option)
    if (!applied || applied.length === 0) continue
    const final = applied[applied.length - 1]!
    effective.push({
      option,
      value: final.value,
      source: final.source,
    })
    overrideTrail.push({
      option,
      applied,
      finalSource: final.source,
      finalValue: final.value,
    })
  }

  return {
    precedence: ['defaults', 'profile', 'env', 'argv'],
    effective,
    overrideTrail,
  }
}

export const resolveRuntimeConfigResolution = (
  argv: ReadonlyArray<string>,
  options: RuntimeConfigResolveOptions = {},
): Effect.Effect<RuntimeConfigResolution, unknown> =>
  Effect.gen(function* () {
    const env = options.env ?? process.env
    const envLayer = buildEnvLayer(env)
    const shouldSkipCliConfig = argv.includes('-h') || argv.includes('--help') || argv.length === 0

    const cliConfig = shouldSkipCliConfig ? EMPTY_CLI_CONFIG_RESOLUTION : yield* resolveCliConfigArgvPrefixResolution(argv)
    const argvWithConfigPrefix = [...cliConfig.prefix, ...envLayer.tokens, ...argv]
    const trace = buildConfigTrace({
      argv,
      cliConfig,
      envLayer,
    })

    return {
      argvWithConfigPrefix,
      cliConfig,
      envLayer,
      trace,
    }
  })
