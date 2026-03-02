import fs from 'node:fs/promises'
import path from 'node:path'

export type VerifyLoopVerdict = 'PASS' | 'ERROR' | 'VIOLATION' | 'RETRYABLE' | 'NOT_IMPLEMENTED' | 'NO_PROGRESS'
export type VerifyLoopMode = 'run' | 'resume'
export type VerifyLoopGateScope = 'runtime' | 'governance'

type JsonRecord = Record<string, unknown>

type JsonSchema = JsonRecord & {
  readonly required?: ReadonlyArray<string>
  readonly properties?: Record<string, any>
  readonly allOf?: ReadonlyArray<any>
  readonly $defs?: Record<string, any>
  readonly additionalProperties?: unknown
}

const SCHEMAS_ROOT = path.resolve(__dirname, '../../../../specs/103-cli-minimal-kernel-self-loop/contracts/schemas')

const readSchema = async (fileName: string): Promise<JsonSchema> => {
  const text = await fs.readFile(path.join(SCHEMAS_ROOT, fileName), 'utf8')
  return JSON.parse(text) as JsonSchema
}

export const loadVerifyLoopReportSchema = async (): Promise<JsonSchema> => readSchema('verify-loop.report.v1.schema.json')

export const loadVerifyLoopInputSchema = async (): Promise<JsonSchema> => readSchema('verify-loop.input.v1.schema.json')

const allOfEntries = (schema: JsonSchema): ReadonlyArray<any> => (Array.isArray(schema.allOf) ? schema.allOf : [])

const conditionalConst = (entry: any, key: string): string | undefined => {
  const value = entry?.if?.properties?.[key]?.const
  return typeof value === 'string' ? value : undefined
}

export const extractVerdictExitCodeMap = (schema: JsonSchema): Record<VerifyLoopVerdict, number | undefined> => {
  const output: Partial<Record<VerifyLoopVerdict, number>> = {}
  for (const entry of allOfEntries(schema)) {
    const verdict = conditionalConst(entry, 'verdict') as VerifyLoopVerdict | undefined
    const exitCode = entry?.then?.properties?.exitCode?.const
    if (!verdict || typeof exitCode !== 'number') continue
    output[verdict] = exitCode
  }

  return {
    PASS: output.PASS,
    ERROR: output.ERROR,
    VIOLATION: output.VIOLATION,
    RETRYABLE: output.RETRYABLE,
    NOT_IMPLEMENTED: output.NOT_IMPLEMENTED,
    NO_PROGRESS: output.NO_PROGRESS,
  }
}

export const extractGateScopeGateMap = (schema: JsonSchema): Record<VerifyLoopGateScope, ReadonlyArray<string>> => {
  const output: Partial<Record<VerifyLoopGateScope, ReadonlyArray<string>>> = {}
  for (const entry of allOfEntries(schema)) {
    const gateScope = conditionalConst(entry, 'gateScope') as VerifyLoopGateScope | undefined
    const gates = entry?.then?.properties?.gateResults?.items?.properties?.gate?.enum
    if (!gateScope || !Array.isArray(gates)) continue
    output[gateScope] = gates.filter((gate): gate is string => typeof gate === 'string')
  }

  return {
    runtime: output.runtime ?? [],
    governance: output.governance ?? [],
  }
}

export const extractModeRequiredFields = (schema: JsonSchema): Record<VerifyLoopMode, ReadonlyArray<string>> => {
  const output: Partial<Record<VerifyLoopMode, ReadonlyArray<string>>> = {}
  for (const entry of allOfEntries(schema)) {
    const mode = conditionalConst(entry, 'mode') as VerifyLoopMode | undefined
    const required = entry?.then?.required
    if (!mode || !Array.isArray(required)) continue
    output[mode] = required.filter((name): name is string => typeof name === 'string')
  }

  return {
    run: output.run ?? [],
    resume: output.resume ?? [],
  }
}

export const rootAdditionalPropertiesStrict = (schema: JsonSchema): boolean => schema.additionalProperties === false

export const nestedAdditionalPropertiesStrict = (schema: JsonSchema, defName: string): boolean => {
  const def = schema.$defs?.[defName]
  return def?.additionalProperties === false
}

export const requiredFieldSet = (schema: JsonSchema): ReadonlySet<string> => {
  const required = Array.isArray(schema.required) ? schema.required.filter((name): name is string => typeof name === 'string') : []
  return new Set(required)
}

export const makeVerifyLoopReportFixture = (args?: {
  readonly runId?: string
  readonly instanceId?: string
  readonly mode?: VerifyLoopMode
  readonly gateScope?: VerifyLoopGateScope
  readonly verdict?: VerifyLoopVerdict
  readonly exitCode?: number
  readonly reasonCode?: string
  readonly attemptSeq?: number
  readonly gate?: string
  readonly previousRunId?: string
  readonly reasonData?: Record<string, unknown>
}) => {
  const mode = args?.mode ?? 'run'
  const gateScope = args?.gateScope ?? 'runtime'
  const defaultGate = gateScope === 'governance' ? 'gate:perf-hard' : 'gate:type'
  const defaultReasonCode = args?.verdict === 'RETRYABLE' ? 'VERIFY_RETRYABLE' : args?.verdict === 'NO_PROGRESS' ? 'VERIFY_NO_PROGRESS' : 'GATE_TEST_FAILED'

  return {
    schemaVersion: 1,
    kind: 'VerifyLoopReport',
    runId: args?.runId ?? 'run-1',
    instanceId: args?.instanceId ?? 'loop-a1',
    mode,
    ...(mode === 'resume' ? { previousRunId: args?.previousRunId ?? 'run-0' } : null),
    gateScope,
    txnSeq: 1,
    opSeq: 1,
    attemptSeq: args?.attemptSeq ?? 1,
    verdict: args?.verdict ?? 'PASS',
    exitCode: args?.exitCode ?? 0,
    gateResults: [
      {
        gate: args?.gate ?? defaultGate,
        status: args?.verdict === 'RETRYABLE' ? 'retryable' : args?.verdict === 'VIOLATION' ? 'fail' : 'pass',
        durationMs: 12,
        command: 'pnpm test',
        exitCode: args?.verdict === 'PASS' ? 0 : 1,
        reasonCode: args?.reasonCode ?? defaultReasonCode,
      },
    ],
    reasonCode: args?.reasonCode ?? defaultReasonCode,
    reasons: [
      {
        code: args?.reasonCode ?? defaultReasonCode,
        message: 'fixture reason',
        ...(args?.reasonData ? { data: args.reasonData } : null),
      },
    ],
    trajectory: [
      {
        attemptSeq: args?.attemptSeq ?? 1,
        reasonCode: args?.reasonCode ?? defaultReasonCode,
      },
    ],
    nextActions: [{ id: 'fix-gate', action: 'inspect', args: { mode: 'manual' } }],
    artifacts: [{ name: 'verify-loop.report.json', path: 'artifacts/verify-loop.report.json' }],
  }
}

export const makeVerifyLoopInputFixture = (args?: {
  readonly mode?: VerifyLoopMode
  readonly runId?: string
  readonly previousRunId?: string
  readonly instanceId?: string
}) => {
  const mode = args?.mode ?? 'run'

  return {
    schemaVersion: 1,
    kind: 'VerifyLoopInput',
    mode,
    instanceId: args?.instanceId ?? 'loop-a1',
    runId: args?.runId ?? 'run-1',
    ...(mode === 'resume' ? { previousRunId: args?.previousRunId ?? 'run-0' } : null),
    target: 'packages/logix-cli',
    maxAttempts: 3,
    nonTty: true,
  }
}
