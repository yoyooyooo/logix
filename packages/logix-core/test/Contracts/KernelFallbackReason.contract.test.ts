import { describe, expect, it } from '@effect/vitest'
import {
  KERNEL_FALLBACK_REASONS,
  toConvergeKernelFallbackReason,
  toDirtyPlanKernelFallbackReason,
  toExternalStoreKernelFallbackReason,
  toSelectorKernelFallbackReason,
  toSourceKernelFallbackReason,
  toValidateKernelFallbackReason,
} from '../../src/internal/runtime/core/kernelFallbackReason.js'

describe('KernelFallbackReason internal contract', () => {
  it('locks the internal fallback vocabulary', () => {
    expect(KERNEL_FALLBACK_REASONS).toEqual([
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
    ])
  })

  it('maps local source, validate, selector, converge, dirtyPlan, and externalStore reasons into the unified vocabulary', () => {
    expect(toSourceKernelFallbackReason('missing_dirty_plan')).toBe('missing_dirty_plan')
    expect(toSourceKernelFallbackReason('missing_source_dep_ir')).toBe('missing_ir')
    expect(toSourceKernelFallbackReason('non_field_path_authority')).toBe('missing_registry')
    expect(toSourceKernelFallbackReason('field_paths_key_mismatch')).toBe('field_paths_key_mismatch')
    expect(toSourceKernelFallbackReason('field_path_count_mismatch')).toBe('field_path_count_mismatch')
    expect(toSourceKernelFallbackReason('invalid_root_id')).toBe('invalid_root_id')
    expect(toSourceKernelFallbackReason('missing_list_evidence')).toBe('missing_list_evidence')
    expect(toSourceKernelFallbackReason('list_root_touched')).toBe('list_root_touched')
    expect(toSourceKernelFallbackReason('missing_changed_indices')).toBe('dirty_root_fallback')

    expect(toValidateKernelFallbackReason('missing_validate_ir')).toBe('missing_validate_ir')

    expect(toSelectorKernelFallbackReason('dirty-all')).toBe('dirty_all')
    expect(toSelectorKernelFallbackReason('missing-path-authority')).toBe('missing_registry')
    expect(toSelectorKernelFallbackReason('missing-dirty-path')).toBe('invalid_root_id')
    expect(toSelectorKernelFallbackReason('unsafe-coarse-root')).toBe('dirty_root_fallback')
    expect(toSelectorKernelFallbackReason('evaluate-all')).toBe('dirty_root_fallback')

    expect(toConvergeKernelFallbackReason('dirty_all')).toBe('dirty_all')
    expect(toConvergeKernelFallbackReason('legacyDirtyPaths')).toBe('legacy_dirty_input')
    expect(toConvergeKernelFallbackReason('unknown_dirty')).toBe('unknown_write')

    expect(toDirtyPlanKernelFallbackReason('missing_dirty_plan')).toBe('missing_dirty_plan')
    expect(toDirtyPlanKernelFallbackReason('dirty_all')).toBe('dirty_all')

    expect(toExternalStoreKernelFallbackReason('external_store::unresolved')).toBe('external_store_unresolved')
    expect(toExternalStoreKernelFallbackReason('external_store::unresolvable_module_id')).toBe('external_store_unresolved')
    expect(toExternalStoreKernelFallbackReason('external_store::missing_initial')).toBe('external_store_missing_initial')
    expect(toExternalStoreKernelFallbackReason('external_store::unstable_selector_id')).toBe('external_store_unstable_selector')
    expect(toExternalStoreKernelFallbackReason('external_store::snapshot_threw')).toBe('external_store_snapshot_error')
    expect(toExternalStoreKernelFallbackReason('external_store::module_source_degraded')).toBe(
      'external_store_module_source_degraded',
    )
  })
})
