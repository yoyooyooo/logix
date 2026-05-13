export type RuntimeHotPathZone =
  | 'kernel'
  | 'runtime-shell'
  | 'control-plane'
  | 'process'
  | 'runner'
  | 'unknown'

export type HotPathReopenTrigger =
  | 'new-reproducible-runtime-failure'
  | 'new-clean-comparable-evidence'
  | 'new-runtime-sla-breach'
  | 'archive-only-historical-note'
  | 'diagnostics-only-local-gain'

export interface HotPathEvidencePolicyInput {
  readonly zone: RuntimeHotPathZone
  readonly activeSpecId: string
  readonly diagnosticsOnlyGain?: boolean
}

export interface HotPathEvidencePolicy {
  readonly mode: 'baseline-diff' | 'audit-only'
  readonly activeRoute: string | null
  readonly backgroundRoutes: ReadonlyArray<string>
  readonly noGo: ReadonlyArray<string>
}

const KERNEL_ROOT = 'packages/logix-core/src/internal/runtime/core/'
const PROCESS_ROOT = `${KERNEL_ROOT}process/`
const RUNNER_ROOT = `${KERNEL_ROOT}runner/`
const INTERNAL_RUNTIME_ROOT = 'packages/logix-core/src/internal/runtime/'
const CONTROL_PLANE_ROOTS = [
  'packages/logix-core/src/ControlPlane.ts',
  'packages/logix-core/src/internal/debug-api.ts',
  'packages/logix-core/src/internal/evidence-api.ts',
  'packages/logix-core/src/internal/reflection-api.ts',
  'packages/logix-core/src/internal/kernel-api.ts',
  'packages/logix-core/src/internal/observability/',
  'packages/logix-core/src/internal/reflection/',
  'packages/logix-core/src/internal/verification/',
  'packages/logix-core/src/internal/debug/',
] as const
const RUNTIME_SHELL_ROOTS = [
  'packages/logix-core/src/Runtime.ts',
  'packages/logix-core/src/Module.ts',
  'packages/logix-core/src/Logic.ts',
  INTERNAL_RUNTIME_ROOT,
] as const

const includesAny = (path: string, roots: ReadonlyArray<string>): boolean => roots.some((root) => path.includes(root))

export const classifyRuntimeHotPathZone = (codePath: string): RuntimeHotPathZone => {
  if (codePath.includes(PROCESS_ROOT)) return 'process'
  if (codePath.includes(RUNNER_ROOT)) {
    return 'runner'
  }
  if (includesAny(codePath, CONTROL_PLANE_ROOTS)) return 'control-plane'
  if (codePath.includes(KERNEL_ROOT)) return 'kernel'
  if (includesAny(codePath, RUNTIME_SHELL_ROOTS)) return 'runtime-shell'
  return 'unknown'
}

export const isSteadyStateHotPathZone = (zone: RuntimeHotPathZone): boolean => zone === 'kernel'

export const getHotPathEvidencePolicy = ({
  zone,
  activeSpecId,
  diagnosticsOnlyGain = false,
}: HotPathEvidencePolicyInput): HotPathEvidencePolicy => {
  if (diagnosticsOnlyGain) {
    return {
      mode: 'baseline-diff',
      activeRoute: `specs/${activeSpecId}/perf/*.json`,
      backgroundRoutes: ['specs/115-core-kernel-extraction/perf/*.json'],
      noGo: ['只证明 diagnostics=on 局部收益，无法解释 default steady-state'],
    }
  }

  if (zone === 'kernel') {
    return {
      mode: 'baseline-diff',
      activeRoute: `specs/${activeSpecId}/perf/*.json`,
      backgroundRoutes: ['specs/115-core-kernel-extraction/perf/*.json'],
      noGo: ['comparable=false', 'profile/env drift', '口头结论'],
    }
  }

  return {
    mode: 'audit-only',
    activeRoute: null,
    backgroundRoutes: ['docs/archive/perf/**'],
    noGo: [],
  }
}

export const shouldReopenHotPath = (trigger: HotPathReopenTrigger): boolean =>
  trigger === 'new-reproducible-runtime-failure' ||
  trigger === 'new-clean-comparable-evidence' ||
  trigger === 'new-runtime-sla-breach'
