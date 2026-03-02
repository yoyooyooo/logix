import { Effect } from 'effect'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { COMMAND_REGISTRY, type CommandRegistryEntry } from '../commandRegistry.js'
import type { CliConfigArgvPrefixResolution } from '../cliConfig.js'
import { VERIFICATION_CHAIN_CATALOG_V1 } from '../contracts/verificationChains.js'
import { asSerializableErrorSummary } from '../errors.js'
import { exitCodeFromVerdict, type CommandVerdict } from '../protocol/resultV2.js'
import { assertDescribeReportV1Schema, assertVerificationChainCatalogV1Schema } from '../protocol/schemaValidation.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'
import type { ConfigResolutionTrace, EnvConfigLayer } from '../runtime/configResolution.js'

type DescribeInvocation = Extract<CliInvocation, { readonly command: 'describe' }>

export type DescribeRuntimeContext = {
  readonly argv: ReadonlyArray<string>
  readonly argvWithConfigPrefix: ReadonlyArray<string>
  readonly env: NodeJS.ProcessEnv
  readonly cliConfig: CliConfigArgvPrefixResolution
  readonly envLayer: EnvConfigLayer
  readonly configTrace: ConfigResolutionTrace
}

type DescribeReportV1 = {
  readonly schemaVersion: 1
  readonly kind: 'CliDescribeReport'
  readonly nonGoals: ReadonlyArray<string>
  readonly agentGuidance: {
    readonly source: 'primitives.capability-model.v1'
    readonly verificationChains: ReadonlyArray<{
      readonly id: 'static-contract' | 'dynamic-evidence' | 'change-safety' | 'closure-ready'
      readonly purpose: string
      readonly primitiveChain: ReadonlyArray<string>
      readonly expectedArtifacts: ReadonlyArray<string>
      readonly expectedOutputKeys: ReadonlyArray<string>
    }>
  }
  readonly protocol: {
    readonly commandResultSchemaRef: string
    readonly reasonCodeCatalogRef: string
    readonly exitCodes: ReadonlyArray<{
      readonly code: ReturnType<typeof exitCodeFromVerdict>
      readonly meaning: CommandVerdict
    }>
  }
  readonly commands: ReadonlyArray<CommandRegistryEntry['contract']>
  readonly runtimeExecutableTruth: {
    readonly source: 'command-registry.availability'
    readonly executableCommandNames: ReadonlyArray<string>
    readonly migrationCommandNames: ReadonlyArray<string>
    readonly unavailableCommandNames: ReadonlyArray<string>
  }
  readonly migrationEntries: ReadonlyArray<{
    readonly command: string
    readonly replacementHint: string
  }>
  readonly configVisibility: {
    readonly precedence: readonly ['defaults', 'profile', 'env', 'argv']
    readonly argv: ReadonlyArray<string>
    readonly argvWithConfigPrefix: ReadonlyArray<string>
    readonly cliConfigPathArg?: string
    readonly profile?: string
    readonly discoveredPath?: string
    readonly layers: ReadonlyArray<{
      readonly source: 'defaults' | 'profile' | 'env'
      readonly profile?: string
      readonly tokens: ReadonlyArray<string>
      readonly bindings?: ReadonlyArray<{
        readonly env: string
        readonly option: `--${string}`
        readonly value: string
      }>
    }>
    readonly effective: ConfigResolutionTrace['effective']
    readonly overrideTrail: ConfigResolutionTrace['overrideTrail']
    readonly discovery: CliConfigArgvPrefixResolution['discovery']
  }
  readonly ext?: {
    readonly internal: {
      readonly orchestration: {
        readonly source: 'spec-103.scenario-index'
        readonly contractRef: string
        readonly remediationMapRef: string
        readonly scenarios: ReadonlyArray<{
          readonly id: string
          readonly recommendedPrimitiveChain: ReadonlyArray<string>
        }>
      }
    }
  }
}

const toConfigLayers = (
  layers: ReadonlyArray<CliConfigArgvPrefixResolution['layers'][number]>,
  envLayer: EnvConfigLayer,
): DescribeReportV1['configVisibility']['layers'] =>
  [
    ...layers.map((layer) =>
      layer.source === 'profile'
        ? { source: 'profile' as const, profile: layer.profile, tokens: layer.tokens }
        : { source: 'defaults' as const, tokens: layer.tokens },
    ),
    ...(envLayer.tokens.length > 0 || envLayer.bindings.length > 0
      ? ([
          {
            source: 'env' as const,
            tokens: envLayer.tokens,
            bindings: envLayer.bindings,
          },
        ] as const)
      : []),
  ]

const COMMAND_VERDICTS: ReadonlyArray<CommandVerdict> = [
  'PASS',
  'ERROR',
  'VIOLATION',
  'RETRYABLE',
  'NOT_IMPLEMENTED',
  'NO_PROGRESS',
]

const protocolExitCodes: DescribeReportV1['protocol']['exitCodes'] = COMMAND_VERDICTS.map((meaning) => ({
  code: exitCodeFromVerdict(meaning),
  meaning,
}))

const pickFirstExecutableCommand = (
  candidates: ReadonlyArray<CommandRegistryEntry['command']>,
  executableCommands: ReadonlySet<string>,
): string | undefined => {
  for (const candidate of candidates) {
    if (executableCommands.has(candidate)) {
      return candidate
    }
  }
  return undefined
}

const uniqInOrder = (values: ReadonlyArray<string>): ReadonlyArray<string> => {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value)
      ordered.push(value)
    }
  }
  return ordered
}

const resolveVerificationChains = (
  executableCommands: ReadonlySet<string>,
): DescribeReportV1['agentGuidance']['verificationChains'] => {
  const commandOutputMetaMap = new Map<
    string,
    {
      readonly outputKeys: ReadonlyArray<string>
      readonly artifactFiles: ReadonlyArray<string>
    }
  >(
    COMMAND_REGISTRY.filter((entry) => entry.availability === 'available' && entry.visibility === 'primary').map((entry) => [
      entry.command,
      {
        outputKeys: entry.contract.outputs.map((output) => output.outputKey),
        artifactFiles: entry.contract.outputs
          .map((output) => output.defaultArtifactFileName)
          .filter((fileName): fileName is string => typeof fileName === 'string' && fileName.length > 0),
      },
    ]),
  )

  assertVerificationChainCatalogV1Schema(VERIFICATION_CHAIN_CATALOG_V1)

  return VERIFICATION_CHAIN_CATALOG_V1.chains.map((template) => {
    const selectedCommands = template.commandSteps
      .map((step) => pickFirstExecutableCommand(step, executableCommands))
      .filter((command): command is string => typeof command === 'string')
    const expectedOutputKeys = uniqInOrder(
      selectedCommands.flatMap((command) => commandOutputMetaMap.get(command)?.outputKeys ?? []),
    )
    const expectedArtifacts = uniqInOrder(
      selectedCommands.flatMap((command) => commandOutputMetaMap.get(command)?.artifactFiles ?? []),
    )

    return {
      id: template.id,
      purpose: template.purpose,
      primitiveChain: uniqInOrder(selectedCommands),
      expectedArtifacts,
      expectedOutputKeys,
    }
  }).filter((chain) => chain.primitiveChain.length > 0)
}

const SCENARIO_PROJECTION: DescribeReportV1['ext'] = {
  internal: {
    orchestration: {
      source: 'spec-103.scenario-index',
      contractRef: 'specs/103-cli-minimal-kernel-self-loop/contracts/scenario-index.md',
      remediationMapRef: 'specs/103-cli-minimal-kernel-self-loop/contracts/scenario-remediation-map.md',
      scenarios: [
        {
          id: 'S01',
          recommendedPrimitiveChain: [
            'describe',
            'ir.export',
            'trialrun.evidence',
            'ir.validate.contract',
            'verify-loop.run',
            'next-actions.exec',
          ],
        },
        {
          id: 'S03',
          recommendedPrimitiveChain: [
            'describe',
            'ir.export',
            'trialrun.evidence',
            'transform.module.report',
            'verify-loop.run',
            'next-actions.exec',
          ],
        },
        {
          id: 'S06',
          recommendedPrimitiveChain: [
            'describe',
            'ir.export',
            'trialrun.evidence',
            'ir.validate.contract',
            'verify-loop.run',
            'next-actions.exec',
          ],
        },
        {
          id: 'S08',
          recommendedPrimitiveChain: ['describe', 'trialrun.evidence', 'verify-loop.run', 'next-actions.exec'],
        },
        {
          id: 'S09',
          recommendedPrimitiveChain: ['describe', 'ir.export', 'trialrun.evidence', 'transform.module.report', 'verify-loop.run'],
        },
        {
          id: 'S10',
          recommendedPrimitiveChain: ['describe', 'ir.export', 'trialrun.evidence', 'verify-loop.run', 'next-actions.exec'],
        },
      ],
    },
  },
}

const projectRuntimeExecutableCommands = (): {
  readonly contracts: ReadonlyArray<CommandRegistryEntry['contract']>
  readonly executableCommandNames: ReadonlyArray<string>
  readonly migrationCommandNames: ReadonlyArray<string>
  readonly unavailableCommandNames: ReadonlyArray<string>
  readonly migrationEntries: DescribeReportV1['migrationEntries']
} => {
  const executableEntries = COMMAND_REGISTRY.filter(
    (entry) => entry.availability === 'available' && entry.visibility === 'primary',
  )
  const migrationEntries = COMMAND_REGISTRY.filter(
    (entry) => entry.availability === 'available' && entry.visibility === 'migration',
  )
  const unavailableCommandNames = COMMAND_REGISTRY.filter((entry) => entry.availability === 'unavailable').map(
    (entry) => entry.command,
  )

  return {
    contracts: executableEntries.map((entry) => entry.contract),
    executableCommandNames: executableEntries.map((entry) => entry.command),
    migrationCommandNames: migrationEntries.map((entry) => entry.command),
    unavailableCommandNames,
    migrationEntries: migrationEntries.map((entry) => ({
      command: entry.command,
      replacementHint: entry.command === 'contract-suite.run'
        ? 'ir validate --profile contract'
        : entry.command === 'spy.evidence'
          ? 'trialrun --emit evidence'
          : 'ir export --with-anchors',
    })),
  }
}

const makeDescribeReport = (ctx: DescribeRuntimeContext): DescribeReportV1 => {
  const runtimeProjection = projectRuntimeExecutableCommands()
  const includeInternalOrchestration = ctx.env.LOGIX_DESCRIBE_INTERNAL === '1'
  const executableCommands = new Set(runtimeProjection.executableCommandNames)

  return {
    schemaVersion: 1,
    kind: 'CliDescribeReport',
    nonGoals: [
      'CLI_IS_NOT_AGENT_RUNTIME',
      'CLI_MUST_NOT_EMBED_LOOP_MEMORY_POLICY',
      'CLI_AGENT_DECISIONS_MUST_STAY_EXTERNAL',
    ],
    agentGuidance: {
      source: 'primitives.capability-model.v1',
      verificationChains: resolveVerificationChains(executableCommands),
    },
    protocol: {
      commandResultSchemaRef: 'specs/103-cli-minimal-kernel-self-loop/contracts/schemas/command-result.v2.schema.json',
      reasonCodeCatalogRef: 'specs/103-cli-minimal-kernel-self-loop/contracts/reason-catalog.md',
      exitCodes: protocolExitCodes,
    },
    commands: runtimeProjection.contracts,
    runtimeExecutableTruth: {
      source: 'command-registry.availability',
      executableCommandNames: runtimeProjection.executableCommandNames,
      migrationCommandNames: runtimeProjection.migrationCommandNames,
      unavailableCommandNames: runtimeProjection.unavailableCommandNames,
    },
    migrationEntries: runtimeProjection.migrationEntries,
    configVisibility: {
      precedence: ['defaults', 'profile', 'env', 'argv'],
      argv: ctx.argv,
      argvWithConfigPrefix: ctx.argvWithConfigPrefix,
      ...(ctx.cliConfig.cliConfigPathArg ? { cliConfigPathArg: ctx.cliConfig.cliConfigPathArg } : null),
      ...(ctx.cliConfig.profile ? { profile: ctx.cliConfig.profile } : null),
      ...(ctx.cliConfig.discoveredPath ? { discoveredPath: ctx.cliConfig.discoveredPath } : null),
      layers: toConfigLayers(ctx.cliConfig.layers, ctx.envLayer),
      effective: ctx.configTrace.effective,
      overrideTrail: ctx.configTrace.overrideTrail,
      discovery: ctx.cliConfig.discovery,
    },
    ...(includeInternalOrchestration ? { ext: SCENARIO_PROJECTION } : null),
  }
}

export const runDescribe = (
  inv: DescribeInvocation,
  ctx: DescribeRuntimeContext,
): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const report = makeDescribeReport(ctx)
    assertDescribeReportV1Schema(report)
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
    Effect.catchAll((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'describe',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
