export const KERNEL_FALLBACK_REASONS = [
  'missing_ir',
  'dirty_all',
  'missing_registry',
  'field_paths_key_mismatch',
  'field_path_count_mismatch',
  'invalid_root_id',
  'dirty_root_fallback',
  'list_root_touched',
  'missing_list_evidence',
  'missing_validate_ir',
  'legacy_dirty_input',
  'missing_dirty_plan',
  'external_store_unresolved',
  'external_store_missing_initial',
  'external_store_unstable_selector',
  'external_store_snapshot_error',
  'external_store_module_source_degraded',
  'unknown_write',
] as const

export type KernelFallbackReason = (typeof KERNEL_FALLBACK_REASONS)[number]

export const isKernelFallbackReason = (value: unknown): value is KernelFallbackReason =>
  typeof value === 'string' && (KERNEL_FALLBACK_REASONS as ReadonlyArray<string>).includes(value)

export const toSourceKernelFallbackReason = (reason: string | undefined): KernelFallbackReason => {
  switch (reason) {
    case 'missing_dirty_plan':
      return 'missing_dirty_plan'
    case 'missing_source_dep_ir':
      return 'missing_ir'
    case 'dirty_all':
      return 'dirty_all'
    case 'non_field_path_authority':
      return 'missing_registry'
    case 'field_paths_key_mismatch':
      return 'field_paths_key_mismatch'
    case 'field_path_count_mismatch':
      return 'field_path_count_mismatch'
    case 'invalid_root_id':
      return 'invalid_root_id'
    case 'missing_list_evidence':
      return 'missing_list_evidence'
    case 'list_root_touched':
      return 'list_root_touched'
    case 'missing_changed_indices':
      return 'dirty_root_fallback'
    default:
      return 'unknown_write'
  }
}

export const toDirtyPlanKernelFallbackReason = (reason: string | undefined): KernelFallbackReason => {
  switch (reason) {
    case 'missing_dirty_plan':
      return 'missing_dirty_plan'
    case 'dirty_all':
      return 'dirty_all'
    default:
      return 'unknown_write'
  }
}

export const toExternalStoreKernelFallbackReason = (reason: string | undefined): KernelFallbackReason => {
  switch (reason) {
    case 'external_store::unresolved':
    case 'external_store::unresolvable_module_id':
      return 'external_store_unresolved'
    case 'external_store::missing_initial':
      return 'external_store_missing_initial'
    case 'external_store::unstable_selector_id':
      return 'external_store_unstable_selector'
    case 'external_store::snapshot_threw':
      return 'external_store_snapshot_error'
    case 'external_store::module_source_degraded':
      return 'external_store_module_source_degraded'
    default:
      return 'unknown_write'
  }
}

export const toValidateKernelFallbackReason = (reason: string | undefined): KernelFallbackReason => {
  switch (reason) {
    case 'missing_validate_ir':
      return 'missing_validate_ir'
    default:
      return 'missing_ir'
  }
}

export const toSelectorKernelFallbackReason = (reason: string | undefined): KernelFallbackReason => {
  switch (reason) {
    case 'dirty-all':
      return 'dirty_all'
    case 'missing-path-authority':
      return 'missing_registry'
    case 'missing-dirty-path':
      return 'invalid_root_id'
    case 'unsafe-coarse-root':
    case 'evaluate-all':
      return 'dirty_root_fallback'
    default:
      return 'unknown_write'
  }
}

export const toConvergeKernelFallbackReason = (reason: string | undefined): KernelFallbackReason => {
  switch (reason) {
    case 'dirty_all':
      return 'dirty_all'
    case 'legacyDirtyPaths':
      return 'legacy_dirty_input'
    case 'unknown_dirty':
    case 'unknown_write':
    case 'unknownWrite':
      return 'unknown_write'
    default:
      return 'unknown_write'
  }
}
