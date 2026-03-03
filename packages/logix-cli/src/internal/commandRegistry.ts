import type { CliCommand } from './args.js'

export type OptionContractV1 = {
  readonly name: `--${string}`
  readonly type: 'string' | 'integer' | 'boolean' | 'enum' | 'kv'
  readonly required: boolean
  readonly repeatable?: boolean
  readonly default?: string | number | boolean
  readonly enumValues?: ReadonlyArray<string>
}

export type CommandContractV1 = {
  readonly name: string
  readonly category: 'meta' | 'oracle' | 'gate' | 'write'
  readonly summary: string
  readonly options: ReadonlyArray<OptionContractV1>
  readonly outputs: ReadonlyArray<{
    readonly outputKey: string
    readonly kind: string
    readonly schemaRef?: string
    readonly defaultArtifactFileName?: string
  }>
  readonly exitCodes: ReadonlyArray<0 | 1 | 2 | 3 | 4 | 5>
}

export type CommandAvailability = 'available' | 'unavailable'
export type CommandVisibility = 'primary' | 'migration'

export type CommandRegistryEntry = {
  readonly command: CliCommand
  readonly usage: string
  readonly availability: CommandAvailability
  readonly visibility: CommandVisibility
  readonly contract: CommandContractV1
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

const makeCommandContract = (
  input: Omit<CommandContractV1, 'options' | 'exitCodes'> & {
    readonly options?: ReadonlyArray<OptionContractV1>
    readonly excludeGlobalOptions?: ReadonlyArray<OptionContractV1['name']>
    readonly exitCodes?: ReadonlyArray<0 | 1 | 2 | 3 | 4 | 5>
  },
): CommandContractV1 => {
  const excludedGlobalOptions = input.excludeGlobalOptions ?? []
  const globalOptions =
    excludedGlobalOptions.length > 0
      ? GLOBAL_OPTIONS.filter((option) => !excludedGlobalOptions.includes(option.name))
      : GLOBAL_OPTIONS

  return {
    ...input,
    options: [...globalOptions, ...(input.options ?? [])],
    exitCodes: input.exitCodes ?? [0, 1, 2],
  }
}

const makeRegistryEntry = (input: {
  readonly command: CliCommand
  readonly usage: string
  readonly availability?: CommandAvailability
  readonly visibility?: CommandVisibility
  readonly contract: CommandContractV1
}): CommandRegistryEntry => ({
  command: input.command,
  usage: input.usage,
  availability: input.availability ?? 'available',
  visibility: input.visibility ?? 'primary',
  contract: input.contract,
})

export const COMMAND_REGISTRY: ReadonlyArray<CommandRegistryEntry> = [
  makeRegistryEntry({
    command: 'describe',
    usage: 'logix describe --runId <id> --json [--out <dir>]',
    contract: makeCommandContract({
      name: 'describe',
      category: 'meta',
      summary: '机器可读命令契约与配置可见性（仅支持 --json）',
      options: [{ name: '--json', type: 'boolean', required: true, default: true }],
      outputs: [{ outputKey: 'describeReport', kind: 'CliDescribeReport', defaultArtifactFileName: 'describe.report.json' }],
    }),
  }),
  makeRegistryEntry({
    command: 'ir.export',
    usage: 'logix ir export --runId <id> --entry <modulePath>#<exportName> [--with-anchors] [--out <dir>]',
    contract: makeCommandContract({
      name: 'ir.export',
      category: 'oracle',
      summary: '导出控制面 IR（manifest/workflow surface）',
      options: [
        { name: '--entry', type: 'string', required: true },
        { name: '--with-anchors', type: 'boolean', required: false, default: false },
      ],
      outputs: [
        {
          outputKey: 'controlSurfaceManifest',
          kind: 'ControlSurfaceManifest',
          defaultArtifactFileName: 'control-surface.manifest.json',
        },
        { outputKey: 'workflowSurface', kind: 'WorkflowSurfaceBundle', defaultArtifactFileName: 'workflow.surface.json' },
      ],
    }),
  }),
  makeRegistryEntry({
    command: 'ir.validate',
    usage: 'logix ir validate --runId <id> --in <dir> [--profile contract|cross-module] [--out <dir>]',
    contract: makeCommandContract({
      name: 'ir.validate',
      category: 'gate',
      summary: '对导出工件做结构化门禁校验',
      excludeGlobalOptions: ['--profile'],
      options: [
        { name: '--in', type: 'string', required: false },
        { name: '--artifact', type: 'string', required: false },
        { name: '--profile', type: 'enum', required: false, enumValues: ['contract', 'cross-module'] },
      ],
      outputs: [{ outputKey: 'irValidateReport', kind: 'IrValidateReport', defaultArtifactFileName: 'ir.validate.report.json' }],
    }),
  }),
  makeRegistryEntry({
    command: 'ir.diff',
    usage: 'logix ir diff --runId <id> --before <dir|file> --after <dir|file> [--out <dir>]',
    contract: makeCommandContract({
      name: 'ir.diff',
      category: 'gate',
      summary: '比较 before/after 工件差异并门禁化',
      options: [
        { name: '--before', type: 'string', required: true },
        { name: '--after', type: 'string', required: true },
      ],
      outputs: [{ outputKey: 'irDiffReport', kind: 'IrDiffReport', defaultArtifactFileName: 'ir.diff.report.json' }],
    }),
  }),
  makeRegistryEntry({
    command: 'extension.validate',
    usage: 'logix extension validate --runId <id> --manifest <path> [--out <dir>]',
    contract: makeCommandContract({
      name: 'extension.validate',
      category: 'gate',
      summary: '校验 extension manifest 契约并输出摘要',
      options: [{ name: '--manifest', type: 'string', required: true }],
      outputs: [
        { outputKey: 'extensionManifestCheck', kind: 'ExtensionManifestCheck', defaultArtifactFileName: 'extension.validate.report.json' },
      ],
    }),
  }),
  makeRegistryEntry({
    command: 'extension.load',
    usage: 'logix extension load --runId <id> --manifest <path> --stateFile <path> [--out <dir>]',
    contract: makeCommandContract({
      name: 'extension.load',
      category: 'write',
      summary: '加载 extension manifest 并落盘 stateFile（单一真相源）',
      options: [
        { name: '--manifest', type: 'string', required: true },
        { name: '--stateFile', type: 'string', required: true },
      ],
      outputs: [{ outputKey: 'extensionState', kind: 'ExtensionState', defaultArtifactFileName: 'extension.state.json' }],
    }),
  }),
  makeRegistryEntry({
    command: 'extension.reload',
    usage: 'logix extension reload --runId <id> --stateFile <path> [--out <dir>]',
    contract: makeCommandContract({
      name: 'extension.reload',
      category: 'write',
      summary: '仅基于 stateFile 进行 extension reload 并回写状态',
      options: [{ name: '--stateFile', type: 'string', required: true }],
      outputs: [{ outputKey: 'extensionState', kind: 'ExtensionState', defaultArtifactFileName: 'extension.state.json' }],
    }),
  }),
  makeRegistryEntry({
    command: 'extension.status',
    usage: 'logix extension status --runId <id> --stateFile <path> [--json] [--out <dir>]',
    contract: makeCommandContract({
      name: 'extension.status',
      category: 'meta',
      summary: '读取 stateFile 并返回 extension 当前状态',
      options: [
        { name: '--stateFile', type: 'string', required: true },
        { name: '--json', type: 'boolean', required: false, default: false },
      ],
      outputs: [{ outputKey: 'extensionState', kind: 'ExtensionState', defaultArtifactFileName: 'extension.state.json' }],
    }),
  }),
  makeRegistryEntry({
    command: 'trialrun',
    usage:
      'logix trialrun --runId <id> --entry <modulePath>#<exportName> [--out <dir>] [--diagnosticsLevel off|light|full] [--maxEvents <n>] [--timeout <ms>] [--includeTrace] [--emit evidence]',
    contract: makeCommandContract({
      name: 'trialrun',
      category: 'oracle',
      summary: '受控试跑并输出 TrialRunReport',
      options: [
        { name: '--entry', type: 'string', required: true },
        { name: '--diagnosticsLevel', type: 'enum', required: false, default: 'light', enumValues: ['off', 'light', 'full'] },
        { name: '--maxEvents', type: 'integer', required: false },
        { name: '--timeout', type: 'integer', required: false },
        { name: '--includeTrace', type: 'boolean', required: false, default: false },
        { name: '--emit', type: 'enum', required: false, enumValues: ['evidence'] },
        { name: '--config', type: 'kv', required: false, repeatable: true },
      ],
      outputs: [
        { outputKey: 'trialRunReport', kind: 'TrialRunReport', defaultArtifactFileName: 'trialrun.report.json' },
        { outputKey: 'traceSlim', kind: 'TraceSlim', defaultArtifactFileName: 'trace.slim.json' },
        { outputKey: 'evidence', kind: 'TrialRunEvidence', defaultArtifactFileName: 'evidence.json' },
      ],
    }),
  }),
  makeRegistryEntry({
    command: 'contract-suite.run',
    usage:
      'logix contract-suite run --runId <id> --entry <modulePath>#<exportName> [--baseline <dir>] [--out <dir>] [--allowWarn] [--includeContextPack] [--inputs <file|->] [--includeUiKitRegistry] [--packMaxBytes <n>] [--requireRulesManifest] [--includeAnchorAutofill] [--repoRoot <dir>] [--diagnosticsLevel off|light|full] [--maxEvents <n>] [--timeout <ms>] [--includeTrace]',
    visibility: 'migration',
    contract: makeCommandContract({
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
      outputs: [
        { outputKey: 'trialRunReport', kind: 'TrialRunReport', defaultArtifactFileName: 'trialrun.report.json' },
        { outputKey: 'contractSuiteVerdict', kind: 'ContractSuiteVerdict', defaultArtifactFileName: 'contract-suite.verdict.json' },
        {
          outputKey: 'contractSuiteContextPack',
          kind: 'ContractSuiteContextPack',
          defaultArtifactFileName: 'contract-suite.context-pack.json',
        },
        { outputKey: 'manifestDiff', kind: 'ManifestDiff', defaultArtifactFileName: 'manifest.diff.json' },
        { outputKey: 'anchorPatchPlan', kind: 'PatchPlan', defaultArtifactFileName: 'patch.plan.json' },
        { outputKey: 'anchorAutofillReport', kind: 'AutofillReport', defaultArtifactFileName: 'autofill.report.json' },
        { outputKey: 'traceSlim', kind: 'EvidencePackage', defaultArtifactFileName: 'trace.slim.json' },
      ],
    }),
  }),
  makeRegistryEntry({
    command: 'verify-loop',
    usage:
      'logix verify-loop --runId <id> --mode run|resume --target <value> [--executor real|fixture] [--emitNextActions [<file>]] [--gateScope runtime|governance] [--maxAttempts <n>] [--instanceId <id>] [--previousRunId <id>] [--out <dir>]',
    contract: makeCommandContract({
      name: 'verify-loop',
      category: 'gate',
      summary: '执行 verify-loop 门禁链（支持 run/resume 与 runtime/governance）',
      excludeGlobalOptions: ['--mode'],
      options: [
        { name: '--mode', type: 'enum', required: true, enumValues: ['run', 'resume'] },
        { name: '--target', type: 'string', required: true },
        { name: '--executor', type: 'enum', required: false, enumValues: ['real', 'fixture'] },
        { name: '--emitNextActions', type: 'boolean', required: false, default: false },
        { name: '--emitNextActionsOut', type: 'string', required: false },
        { name: '--gateScope', type: 'enum', required: false, default: 'runtime', enumValues: ['runtime', 'governance'] },
        { name: '--maxAttempts', type: 'integer', required: false },
        { name: '--instanceId', type: 'string', required: false },
        { name: '--previousRunId', type: 'string', required: false },
      ],
      outputs: [
        {
          outputKey: 'verifyLoopReport',
          kind: 'VerifyLoopReport',
          schemaRef: 'specs/103-cli-minimal-kernel-self-loop/contracts/schemas/verify-loop.report.v1.schema.json',
          defaultArtifactFileName: 'verify-loop.report.json',
        },
        { outputKey: 'nextActions', kind: 'NextActions', defaultArtifactFileName: 'next-actions.json' },
      ],
      exitCodes: [0, 1, 2, 3, 4, 5],
    }),
  }),
  makeRegistryEntry({
    command: 'next-actions.exec',
    usage:
      'logix next-actions exec --runId <id> [--report <verify-loop.report.json>|--dsl <next-actions.json>] [--engine bootstrap] [--strict] [--out <dir>]',
    contract: makeCommandContract({
      name: 'next-actions.exec',
      category: 'gate',
      summary: '执行 verify-loop nextActions（run-command / rerun / inspect / stop）',
      options: [
        { name: '--report', type: 'string', required: false, default: 'verify-loop.report.json' },
        { name: '--dsl', type: 'string', required: false },
        { name: '--engine', type: 'enum', required: false, default: 'bootstrap', enumValues: ['bootstrap'] },
        { name: '--strict', type: 'boolean', required: false, default: false },
      ],
      outputs: [
        {
          outputKey: 'nextActionsExecution',
          kind: 'NextActionsExecution',
          schemaRef: 'specs/103-cli-minimal-kernel-self-loop/contracts/schemas/next-actions.execution.v1.schema.json',
          defaultArtifactFileName: 'next-actions.execution.json',
        },
      ],
      exitCodes: [0, 1, 2],
    }),
  }),
  makeRegistryEntry({
    command: 'spy.evidence',
    usage:
      'logix spy evidence --runId <id> --entry <modulePath>#<exportName> [--out <dir>] [--maxUsedServices <n>] [--maxRawMode <n>] [--timeout <ms>]',
    visibility: 'migration',
    contract: makeCommandContract({
      name: 'spy.evidence',
      category: 'oracle',
      summary: '采集 $.use(Tag) 证据（不写回源码）',
      options: [
        { name: '--entry', type: 'string', required: true },
        { name: '--maxUsedServices', type: 'integer', required: false },
        { name: '--maxRawMode', type: 'integer', required: false },
        { name: '--timeout', type: 'integer', required: false },
      ],
      outputs: [{ outputKey: 'spyEvidenceReport', kind: 'SpyEvidenceReport', defaultArtifactFileName: 'spy.evidence.report.json' }],
    }),
  }),
  makeRegistryEntry({
    command: 'anchor.index',
    usage: 'logix anchor index --runId <id> [--repoRoot <dir>] [--out <dir>]',
    visibility: 'migration',
    contract: makeCommandContract({
      name: 'anchor.index',
      category: 'oracle',
      summary: '扫描仓库并构建 AnchorIndex',
      options: [{ name: '--repoRoot', type: 'string', required: false, default: '.' }],
      outputs: [{ outputKey: 'anchorIndex', kind: 'AnchorIndex', defaultArtifactFileName: 'anchor.index.json' }],
    }),
  }),
  makeRegistryEntry({
    command: 'anchor.autofill',
    usage: 'logix anchor autofill --runId <id> [--repoRoot <dir>] [--mode report|write] [--tsconfig <path>] [--out <dir>]',
    contract: makeCommandContract({
      name: 'anchor.autofill',
      category: 'write',
      summary: '补齐锚点（默认 report-only）',
      options: [{ name: '--repoRoot', type: 'string', required: false, default: '.' }],
      outputs: [
        { outputKey: 'patchPlan', kind: 'PatchPlan', defaultArtifactFileName: 'patch.plan.json' },
        { outputKey: 'autofillReport', kind: 'AutofillReport', defaultArtifactFileName: 'autofill.report.json' },
        { outputKey: 'writeBackResult', kind: 'WriteBackResult', defaultArtifactFileName: 'writeback.result.json' },
      ],
    }),
  }),
  makeRegistryEntry({
    command: 'transform.module',
    usage:
      'logix transform module --runId <id> --ops <delta.json|-> [--mode report|write] [--repoRoot <dir>] [--tsconfig <path>] [--out <dir>]',
    contract: makeCommandContract({
      name: 'transform.module',
      category: 'write',
      summary: '按 insert/remove/replace 原语生成 module 变更计划（默认 report-only）',
      options: [
        { name: '--repoRoot', type: 'string', required: false, default: '.' },
        { name: '--ops', type: 'string', required: true },
      ],
      outputs: [
        { outputKey: 'patchPlan', kind: 'PatchPlan', defaultArtifactFileName: 'patch.plan.json' },
        { outputKey: 'transformReport', kind: 'TransformReport', defaultArtifactFileName: 'transform.report.json' },
        { outputKey: 'writeBackResult', kind: 'WriteBackResult', defaultArtifactFileName: 'writeback.result.json' },
      ],
    }),
  }),
]

export const COMMAND_REGISTRY_MAP: ReadonlyMap<CliCommand, CommandRegistryEntry> = new Map(
  COMMAND_REGISTRY.map((entry) => [entry.command, entry] as const),
)

export const commandContractsFromRegistry = (): ReadonlyArray<CommandContractV1> =>
  COMMAND_REGISTRY.map((entry) => entry.contract)
