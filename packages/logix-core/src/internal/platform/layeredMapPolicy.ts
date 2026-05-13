export type PlatformLayer =
  | 'surface-authoring'
  | 'field-kernel'
  | 'runtime-core'
  | 'runtime-control-plane'
  | 'ui-projection'
  | 'unknown'

export type PlatformChain = 'implementation' | 'governance' | 'host-projection' | 'unknown'

export type PlatformUpliftBenefit =
  | 'authoring'
  | 'runtime-clarity'
  | 'performance'
  | 'diagnostics'
  | 'platform-narrative-only'
  | 'helper-renaming-only'

const CONTROL_PLANE_ROOTS = [
  'packages/logix-core/src/ControlPlane.ts',
  'packages/logix-core/src/internal/debug-api.ts',
  'packages/logix-core/src/internal/evidence-api.ts',
  'packages/logix-core/src/internal/reflection-api.ts',
  'packages/logix-core/src/internal/kernel-api.ts',
  'packages/logix-core/src/internal/observability/',
  'packages/logix-core/src/internal/reflection/',
  'packages/logix-core/src/internal/verification/',
  'packages/logix-cli/',
  'packages/logix-sandbox/',
  'packages/logix-test/',
] as const

const UI_PROJECTION_ROOTS = ['packages/logix-react/', 'examples/logix-react/'] as const

const SURFACE_AUTHORING_ROOTS = [
  'packages/logix-core/src/',
  'packages/logix-query/',
  'packages/i18n/',
  'packages/domain/',
] as const

const hasAnyRoot = (path: string, roots: ReadonlyArray<string>): boolean => roots.some((root) => path.includes(root))

export const classifyPlatformLayerByCodePath = (codePath: string): PlatformLayer => {
  if (codePath.endsWith('package.json')) return 'unknown'
  if (hasAnyRoot(codePath, CONTROL_PLANE_ROOTS)) return 'runtime-control-plane'
  if (codePath.includes('packages/logix-core/src/internal/runtime/core/')) return 'runtime-core'
  if (
    codePath.includes('packages/logix-core/src/internal/field-kernel/') ||
    codePath.includes('packages/logix-form/src/internal/')
  ) {
    return 'field-kernel'
  }
  if (hasAnyRoot(codePath, UI_PROJECTION_ROOTS)) return 'ui-projection'
  if (
    codePath.includes('packages/logix-form/src/') ||
    hasAnyRoot(codePath, SURFACE_AUTHORING_ROOTS)
  ) {
    return 'surface-authoring'
  }
  return 'unknown'
}

export const classifyPlatformChain = (layer: PlatformLayer): PlatformChain => {
  if (layer === 'surface-authoring' || layer === 'field-kernel' || layer === 'runtime-core') {
    return 'implementation'
  }
  if (layer === 'runtime-control-plane') return 'governance'
  if (layer === 'ui-projection') return 'host-projection'
  return 'unknown'
}

export const getPlatformLayerOwnerSpecs = (layer: PlatformLayer): ReadonlyArray<string> => {
  switch (layer) {
    case 'surface-authoring':
      return ['122', '125', '127']
    case 'field-kernel':
      return ['125']
    case 'runtime-core':
      return ['123']
    case 'runtime-control-plane':
      return ['124']
    case 'ui-projection':
      return ['126']
    default:
      return []
  }
}

export const shouldAcceptLayerUplift = (input: {
  readonly benefit: PlatformUpliftBenefit
  readonly hasCodeRoots: boolean
  readonly hasOwnerSpecs: boolean
}): boolean => {
  if (!input.hasCodeRoots || !input.hasOwnerSpecs) return false
  if (input.benefit === 'platform-narrative-only' || input.benefit === 'helper-renaming-only') return false
  return true
}
