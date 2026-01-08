import { Effect, FiberRef } from 'effect'
import * as Logix from '@logixjs/core'

export const EXEC_VM_EVIDENCE_TRACE_TYPE = 'trace:exec-vm' as const
export const EXEC_VM_EVIDENCE_MODULE_ID = '@logixjs/core-ng' as const
export const EXEC_VM_EVIDENCE_INSTANCE_ID = 'kernel:core-ng' as const

export type ExecVmMissReasonCode = 'not_implemented' | 'missing_capability' | 'disabled'

export interface ExecVmEvidence {
  readonly version: 'v1'
  readonly stage: 'assembly'
  /**
   * hit=true: the Exec VM mode actually took effect in this run (instead of implicitly falling back
   * to the conservative path).
   *
   * Note: for now this only wires the evidence fields and trace plumbing; the Exec VM implementation
   * will be completed in follow-up task 049.
   */
  readonly hit: boolean
  /** Miss reason code (stable enum; no free-form text). */
  readonly reasonCode?: ExecVmMissReasonCode
  /** Optional details; only emitted in light/full (not in off). */
  readonly reasonDetail?: string
  /** Exec IR version (AOT-ready; emitted in light/full, not in off). */
  readonly execIrVersion?: string
  /** Exec IR stable hash (AOT-ready; emitted in light/full, not in off). */
  readonly execIrHash?: string
  /** Evidence recording point (currently fixed to the transaction assembly phase). */
  readonly serviceId?: string
  /** The implId used by the current implementation (for diffing/debugging). */
  readonly implId?: string
}

export const recordExecVmEvidence = (evidence: ExecVmEvidence): Effect.Effect<void, never, any> =>
  Effect.gen(function* () {
    const level = yield* FiberRef.get(Logix.Debug.internal.currentDiagnosticsLevel)
    if (level === 'off') {
      return
    }

    const data: ExecVmEvidence = (() => {
      if (level === 'full') return evidence
      return {
        ...evidence,
        reasonDetail: undefined,
      }
    })()

    yield* Logix.Debug.record({
      type: EXEC_VM_EVIDENCE_TRACE_TYPE,
      moduleId: EXEC_VM_EVIDENCE_MODULE_ID,
      instanceId: EXEC_VM_EVIDENCE_INSTANCE_ID,
      data: data as any,
    })
  })
