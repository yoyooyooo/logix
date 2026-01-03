import { Effect } from 'effect'
import { SandboxClientTag, type MockManifest } from '@logix/sandbox'
import { IrDef } from './IrModule'

type ArtifactBundle = {
  readonly manifest?: any
  readonly staticIr?: any
  readonly diff?: any
  readonly trialRunReport?: any
  readonly evidence?: any
}

const jsonPretty = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch (e) {
    return `<<json stringify failed: ${String(e)}>>`
  }
}

const ellipsis = (text: string, maxChars: number): string => {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars)}\n…(${text.length - maxChars} chars truncated)`
}

const parseJson = (text: string): { ok: true; value: unknown } | { ok: false; error: string } => {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

const looksLikeManifest = (v: any): boolean =>
  v &&
  typeof v === 'object' &&
  typeof v.manifestVersion === 'string' &&
  typeof v.moduleId === 'string' &&
  typeof v.digest === 'string'

const looksLikeStaticIr = (v: any): boolean =>
  v &&
  typeof v === 'object' &&
  typeof v.version === 'string' &&
  typeof v.moduleId === 'string' &&
  typeof v.digest === 'string' &&
  Array.isArray(v.nodes)

const looksLikeTrialRunReport = (v: any): boolean =>
  v && typeof v === 'object' && typeof v.runId === 'string' && typeof v.ok === 'boolean'

const looksLikeManifestDiff = (v: any): boolean =>
  v &&
  typeof v === 'object' &&
  typeof v.version === 'string' &&
  typeof v.verdict === 'string' &&
  Array.isArray(v.changes)

const looksLikeEvidencePackage = (v: any): boolean =>
  v &&
  typeof v === 'object' &&
  typeof v.protocolVersion === 'string' &&
  typeof v.runId === 'string' &&
  Array.isArray(v.events)

const bundleFromUnknown = (value: unknown): ArtifactBundle => {
  const v: any = value
  if (!v || typeof v !== 'object') return {}

  if (
    ('manifest' in v || 'trialRunReport' in v || 'staticIr' in v || 'diff' in v || 'evidence' in v) &&
    (v.manifest || v.trialRunReport || v.staticIr || v.diff || v.evidence)
  ) {
    return {
      manifest: v.manifest,
      staticIr: v.staticIr,
      diff: v.diff,
      trialRunReport: v.trialRunReport,
      evidence: v.evidence,
    }
  }

  if (looksLikeManifest(v)) return { manifest: v }
  if (looksLikeStaticIr(v)) return { staticIr: v }
  if (looksLikeTrialRunReport(v)) return { trialRunReport: v, evidence: (v as any).evidence }
  if (looksLikeManifestDiff(v)) return { diff: v }
  if (looksLikeEvidencePackage(v)) return { evidence: v }
  return {}
}

const buildSandboxIrWrapper = (options: {
  readonly moduleCode: string
  readonly moduleExport: string
  readonly runId: string
  readonly kernelId: string
  readonly diagnosticsLevel: 'off' | 'light' | 'full'
  readonly maxEvents: number
  readonly trialRunTimeoutMs: number
  readonly closeScopeTimeout: number
  readonly maxBytes: number
}): string => {
  const trialRunOptions = {
    runId: options.runId,
    source: { host: 'browser', label: 'sandbox:/ir' },
    buildEnv: { hostKind: 'browser', config: {} },
    diagnosticsLevel: options.diagnosticsLevel,
    maxEvents: options.maxEvents,
    trialRunTimeoutMs: options.trialRunTimeoutMs,
    closeScopeTimeout: options.closeScopeTimeout,
    budgets: { maxBytes: options.maxBytes },
  }

  return [
    `import { Context, Effect, Schema } from "effect"`,
    `import * as Logix from "@logix/core"`,
    ``,
    options.moduleCode,
    ``,
    `const __programModule = ${options.moduleExport}`,
    `const __kernelId = ${JSON.stringify(options.kernelId)}`,
    `const __kernelLayer = (__kernelId === "core" || __kernelId === "core-ng") ? Logix.Kernel.kernelLayer({ kernelId: __kernelId, packageName: "@logix/core" }) : undefined`,
    ``,
    `export default Effect.gen(function* () {`,
    `  const trialRunModule = (Logix as any)?.Observability?.trialRunModule`,
    `  if (typeof trialRunModule !== "function") {`,
    `    throw new Error("[Logix][Sandbox] 缺少 Observability.trialRunModule：请重新 bundle @logix/sandbox kernel（pnpm --filter @logix/sandbox bundle:kernel）")`,
    `  }`,
    `  const options = ${JSON.stringify(trialRunOptions, null, 2)}`,
    `  const report = yield* trialRunModule(__programModule as any, __kernelLayer ? { ...options, layer: __kernelLayer } : options)`,
    `  return { manifest: (report as any)?.manifest, staticIr: (report as any)?.staticIr, trialRunReport: report, evidence: (report as any)?.evidence }`,
    `})`,
    ``,
  ].join('\n')
}

export const IrLogic = IrDef.logic(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    const client = yield* $.use(SandboxClientTag)

    yield* Effect.all(
      [
        $.onAction('init').run(() =>
          Effect.gen(function* () {
            const { kernels, defaultKernelId } = yield* client.listKernels()
            yield* $.dispatchers.setKernelCatalog({ kernels: kernels as any, defaultKernelId: defaultKernelId as any })

            const currentKernelId = (yield* $.state.read).kernelId
            const hasCurrentKernelId = kernels.some((k) => k.kernelId === currentKernelId)
            if (!hasCurrentKernelId) {
              const nextKernelId = defaultKernelId ?? kernels[0]?.kernelId
              if (nextKernelId) {
                yield* $.dispatchers.setKernelId(nextKernelId)
              }
            }

            yield* client.init()
          }),
        ),

        $.onAction('run').runLatest(() =>
          Effect.gen(function* () {
            const state = yield* $.state.read

            const wrapper = buildSandboxIrWrapper({
              moduleCode: state.moduleCode,
              moduleExport: state.moduleExport,
              runId: state.runId,
              kernelId: state.kernelId,
              diagnosticsLevel: state.diagnosticsLevel,
              maxEvents: state.maxEvents,
              trialRunTimeoutMs: state.trialRunTimeoutMs,
              closeScopeTimeout: state.closeScopeTimeout,
              maxBytes: state.maxBytes,
            })

            let mockManifest: MockManifest | undefined = undefined
            const manifestText = state.mockManifestText.trim()
            if (manifestText.length > 0) {
              const parsed = parseJson(manifestText)
              if (!parsed.ok) {
                yield* $.dispatchers.setRunError(parsed.error)
                return
              }
              mockManifest = parsed.value as MockManifest
            }

            const compiled = yield* client.compile(wrapper, 'irProgram.ts', mockManifest, {
              kernelId: state.kernelId,
              strict: state.strict,
              allowFallback: state.allowFallback,
            })
            if (!compiled.success) {
              yield* $.dispatchers.setRunError(compiled.errors?.join('\n') || '编译失败')
              return
            }

            const result = yield* client.run({
              runId: state.runId,
              useCompiledCode: true,
              kernelId: state.kernelId,
              strict: state.strict,
              allowFallback: state.allowFallback,
            })

            yield* $.dispatchers.setRunSummary({
              runId: result.runId,
              duration: result.duration,
              requestedKernelId: (result as any).requestedKernelId,
              effectiveKernelId: (result as any).effectiveKernelId,
              fallbackReason: (result as any).fallbackReason,
              kernelImplementationRef: (result as any).kernelImplementationRef,
            })

            const incoming = bundleFromUnknown((result as any).stateSnapshot)
            if (
              !incoming.manifest &&
              !incoming.staticIr &&
              !incoming.trialRunReport &&
              !incoming.evidence &&
              !incoming.diff
            ) {
              const remoteError = (client as any).getState?.().error
              if (remoteError && typeof remoteError.message === 'string' && remoteError.message.length > 0) {
                throw new Error(remoteError.message)
              }
              throw new Error(
                '运行结果不可识别：请确保 program 返回 { manifest/staticIr/trialRunReport/diff/evidence }\n' +
                  ellipsis(`stateSnapshot=${jsonPretty((result as any).stateSnapshot)}`, 1200),
              )
            }

            yield* $.dispatchers.setBundle(incoming as any)
            yield* $.dispatchers.setActiveTab(incoming.trialRunReport ? 'trialRun' : 'manifest')
          }).pipe(
            Effect.catchAll((e) => $.dispatchers.setRunError(String(e))),
            Effect.ensuring($.dispatchers.setIsRunning(false)),
          ),
        ),
      ],
      { concurrency: 'unbounded' },
    )
  }),
}))
