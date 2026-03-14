import { Effect } from 'effect'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import type { CliConfigArgvPrefixResolution } from '../cliConfig.js'
import { asSerializableErrorSummary } from '../errors.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

type DescribeInvocation = Extract<CliInvocation, { readonly command: 'describe' }>

export type DescribeRuntimeContext = {
  readonly argv: ReadonlyArray<string>
  readonly argvWithConfigPrefix: ReadonlyArray<string>
  readonly cliConfig: CliConfigArgvPrefixResolution
}

type OptionContractV1 = {
  readonly name: `--${string}`
  readonly type: 'string' | 'integer' | 'boolean' | 'enum' | 'kv'
  readonly required: boolean
  readonly repeatable?: boolean
  readonly default?: string | number | boolean
  readonly enumValues?: ReadonlyArray<string>
}

type CommandContractV1 = {
  readonly name: string
  readonly category: 'meta' | 'oracle' | 'gate' | 'write'
  readonly summary: string
  readonly availability: 'available' | 'unavailable'
  readonly unavailableReasonCode?: 'CLI_NOT_IMPLEMENTED'
  readonly options: ReadonlyArray<OptionContractV1>
  readonly outputs: ReadonlyArray<{
    readonly outputKey: string
    readonly kind: string
    readonly schemaRef?: string
  }>
  readonly exitCodes: ReadonlyArray<0 | 1 | 2>
}

type DescribeReportV1 = {
  readonly schemaVersion: 1
  readonly kind: 'CliDescribeReport'
  readonly nonGoals: ReadonlyArray<string>
  readonly protocol: {
    readonly commandResultSchemaRef: string
    readonly reasonCodeCatalogRef: string
    readonly exitCodes: ReadonlyArray<{
      readonly code: 0 | 1 | 2
      readonly meaning: string
    }>
  }
  readonly commands: ReadonlyArray<CommandContractV1>
  readonly configVisibility: {
    readonly precedence: readonly ['defaults', 'profile', 'argv']
    readonly argv: ReadonlyArray<string>
    readonly argvWithConfigPrefix: ReadonlyArray<string>
    readonly cliConfigPathArg?: string
    readonly profile?: string
    readonly discoveredPath?: string
    readonly layers: ReadonlyArray<{
      readonly source: 'defaults' | 'profile'
      readonly profile?: string
      readonly tokens: ReadonlyArray<string>
    }>
    readonly discovery: CliConfigArgvPrefixResolution['discovery']
  }
}

const GLOBAL_OPTIONS: ReadonlyArray<OptionContractV1> = [
  { name: '--runId', type: 'string', required: true },
  { name: '--out', type: 'string', required: false },
  { name: '--outRoot', type: 'string', required: false },
  { name: '--budgetBytes', type: 'integer', required: false },
  { name: '--mode', type: 'enum', required: false, enumValues: ['report', 'write'] },
  { name: '--tsconfig', type: 'string', required: false },
  { name: '--host', type: 'enum', required: false, default: 'node', enumValues: ['node', 'browser-mock'] },
  { name: '--cliConfig', type: 'string', required: false },
  { name: '--profile', type: 'string', required: false },
]

const makeCommand = (
  input: Omit<CommandContractV1, 'options' | 'exitCodes'> & {
    readonly options?: ReadonlyArray<OptionContractV1>
  },
): CommandContractV1 => ({
  ...input,
  options: [...GLOBAL_OPTIONS, ...(input.options ?? [])],
  exitCodes: [0, 1, 2],
})

const makeUnsupportedCommand = (
  input: Omit<CommandContractV1, 'options' | 'exitCodes' | 'outputs' | 'availability' | 'unavailableReasonCode'> & {
    readonly options?: ReadonlyArray<OptionContractV1>
  },
): CommandContractV1 =>
  makeCommand({
    ...input,
    availability: 'unavailable',
    unavailableReasonCode: 'CLI_NOT_IMPLEMENTED',
    outputs: [],
  })

const COMMAND_CONTRACTS: ReadonlyArray<CommandContractV1> = [
  makeCommand({
    name: 'describe',
    category: 'meta',
    summary: '机器可读命令契约与配置可见性（仅支持 --json）',
    availability: 'available',
    options: [{ name: '--json', type: 'boolean', required: true, default: true }],
    outputs: [{ outputKey: 'describeReport', kind: 'CliDescribeReport' }],
  }),
  makeCommand({
    name: 'ir.export',
    category: 'oracle',
    summary: '导出控制面 IR（manifest/workflow surface）',
    availability: 'available',
    options: [{ name: '--entry', type: 'string', required: true }],
    outputs: [
      { outputKey: 'controlSurfaceManifest', kind: 'ControlSurfaceManifest' },
      { outputKey: 'workflowSurface', kind: 'WorkflowSurfaceBundle' },
    ],
  }),
  makeCommand({
    name: 'ir.validate',
    category: 'gate',
    summary: '对导出工件做结构化门禁校验',
    availability: 'available',
    options: [
      { name: '--in', type: 'string', required: false },
      { name: '--artifact', type: 'string', required: false },
    ],
    outputs: [{ outputKey: 'irValidateReport', kind: 'IrValidateReport' }],
  }),
  makeCommand({
    name: 'ir.diff',
    category: 'gate',
    summary: '比较 before/after 工件差异并门禁化',
    availability: 'available',
    options: [
      { name: '--before', type: 'string', required: true },
      { name: '--after', type: 'string', required: true },
    ],
    outputs: [{ outputKey: 'irDiffReport', kind: 'IrDiffReport' }],
  }),
  makeUnsupportedCommand({
    name: 'trialrun',
    category: 'oracle',
    summary: '受控试跑并输出 TrialRunReport',
    options: [
      { name: '--entry', type: 'string', required: true },
      { name: '--diagnosticsLevel', type: 'enum', required: false, default: 'light', enumValues: ['off', 'light', 'full'] },
      { name: '--maxEvents', type: 'integer', required: false },
      { name: '--timeout', type: 'integer', required: false },
      { name: '--includeTrace', type: 'boolean', required: false, default: false },
      { name: '--config', type: 'kv', required: false, repeatable: true },
    ],
  }),
  makeUnsupportedCommand({
    name: 'contract-suite.run',
    category: 'gate',
    summary: '一键验收（trialrun + verdict/context-pack）',
    options: [
      { name: '--entry', type: 'string', required: true },
      { name: '--allowWarn', type: 'boolean', required: false, default: false },
      { name: '--baseline', type: 'string', required: false },
      { name: '--includeContextPack', type: 'boolean', required: false, default: false },
      { name: '--inputs', type: 'string', required: false },
      { name: '--includeUiKitRegistry', type: 'boolean', required: false, default: false },
      { name: '--packMaxBytes', type: 'integer', required: false },
      { name: '--requireRulesManifest', type: 'boolean', required: false, default: false },
      { name: '--includeAnchorAutofill', type: 'boolean', required: false, default: false },
      { name: '--repoRoot', type: 'string', required: false, default: '.' },
      { name: '--diagnosticsLevel', type: 'enum', required: false, default: 'light', enumValues: ['off', 'light', 'full'] },
      { name: '--maxEvents', type: 'integer', required: false },
      { name: '--timeout', type: 'integer', required: false },
      { name: '--includeTrace', type: 'boolean', required: false, default: false },
      { name: '--config', type: 'kv', required: false, repeatable: true },
    ],
  }),
  makeUnsupportedCommand({
    name: 'spy.evidence',
    category: 'oracle',
    summary: '采集 $.use(Tag) 证据（不写回源码）',
    options: [
      { name: '--entry', type: 'string', required: true },
      { name: '--maxUsedServices', type: 'integer', required: false },
      { name: '--maxRawMode', type: 'integer', required: false },
      { name: '--timeout', type: 'integer', required: false },
    ],
  }),
  makeUnsupportedCommand({
    name: 'anchor.index',
    category: 'oracle',
    summary: '扫描仓库并构建 AnchorIndex',
    options: [{ name: '--repoRoot', type: 'string', required: false, default: '.' }],
  }),
  makeCommand({
    name: 'anchor.autofill',
    category: 'write',
    summary: '补齐锚点（默认 report-only）',
    availability: 'available',
    options: [{ name: '--repoRoot', type: 'string', required: false, default: '.' }],
    outputs: [
      { outputKey: 'patchPlan', kind: 'PatchPlan' },
      { outputKey: 'autofillReport', kind: 'AutofillReport' },
      { outputKey: 'writeBackResult', kind: 'WriteBackResult' },
    ],
  }),
  makeUnsupportedCommand({
    name: 'transform.module',
    category: 'write',
    summary: '按 delta 批量变更 module（默认 report-only）',
    options: [
      { name: '--repoRoot', type: 'string', required: false, default: '.' },
      { name: '--ops', type: 'string', required: true },
    ],
  }),
]

const toConfigLayers = (
  layers: ReadonlyArray<CliConfigArgvPrefixResolution['layers'][number]>,
): DescribeReportV1['configVisibility']['layers'] =>
  layers.map((layer) =>
    layer.source === 'profile'
      ? { source: 'profile' as const, profile: layer.profile, tokens: layer.tokens }
      : { source: 'defaults' as const, tokens: layer.tokens },
  )

const makeDescribeReport = (ctx: DescribeRuntimeContext): DescribeReportV1 => ({
  schemaVersion: 1,
  kind: 'CliDescribeReport',
  nonGoals: [
    'CLI_IS_NOT_AGENT_RUNTIME',
    'CLI_MUST_NOT_EMBED_LOOP_MEMORY_POLICY',
    'CLI_AGENT_DECISIONS_MUST_STAY_EXTERNAL',
  ],
  protocol: {
    commandResultSchemaRef: 'specs/085-logix-cli-node-only/contracts/schemas/cli-command-result.schema.json',
    reasonCodeCatalogRef: 'specs/085-logix-cli-node-only/contracts/reason-codes.md',
    exitCodes: [
      { code: 0, meaning: 'PASS' },
      { code: 1, meaning: 'ERROR' },
      { code: 2, meaning: 'VIOLATION_OR_INVALID_INPUT' },
    ],
  },
  commands: COMMAND_CONTRACTS,
  configVisibility: {
    precedence: ['defaults', 'profile', 'argv'],
    argv: ctx.argv,
    argvWithConfigPrefix: ctx.argvWithConfigPrefix,
    ...(ctx.cliConfig.cliConfigPathArg ? { cliConfigPathArg: ctx.cliConfig.cliConfigPathArg } : null),
    ...(ctx.cliConfig.profile ? { profile: ctx.cliConfig.profile } : null),
    ...(ctx.cliConfig.discoveredPath ? { discoveredPath: ctx.cliConfig.discoveredPath } : null),
    layers: toConfigLayers(ctx.cliConfig.layers),
    discovery: ctx.cliConfig.discovery,
  },
})

export const runDescribe = (
  inv: DescribeInvocation,
  ctx: DescribeRuntimeContext,
): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const report = makeDescribeReport(ctx)
    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'describe.report.json',
        outputKey: 'describeReport',
        kind: 'CliDescribeReport',
        value: report,
      }),
    ]

    return makeCommandResult({
      runId,
      command: 'describe',
      ok: true,
      artifacts,
    })
  }).pipe(
    Effect.catch((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'describe',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      )),
  )
}
