import { describe, expect, it } from 'vitest'
import { WORKBENCH_EVIDENCE_GAP_CODES } from '../../src/internal/state/workbench/index.js'
import { RUNTIME_WORKBENCH_GAP_CODES } from '@logixjs/core/repo-internal/workbench-api'

describe('DVTools workbench evidence gap codes', () => {
  it('delegates the gap code set to the core runtime workbench kernel', () => {
    expect(WORKBENCH_EVIDENCE_GAP_CODES).toBe(RUNTIME_WORKBENCH_GAP_CODES)
  })
})
