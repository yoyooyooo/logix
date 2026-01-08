import { fnv1a32, stableStringify } from '../../digest.js'
import type { ReadQueryStaticIr } from './ReadQuery.js'

export type DeclarativeLinkNodeId = string

export type DeclarativeLinkNode =
  | {
      readonly id: DeclarativeLinkNodeId
      readonly kind: 'readQuery'
      readonly moduleId: string
      readonly instanceKey?: string
      /** MUST reuse `ReadQueryStaticIr` (no parallel selector-like IR). */
      readonly readQuery: ReadQueryStaticIr
    }
  | {
      readonly id: DeclarativeLinkNodeId
      readonly kind: 'dispatch'
      readonly moduleId: string
      readonly instanceKey?: string
      readonly actionTag: string
    }

export type DeclarativeLinkEdge = {
  readonly from: DeclarativeLinkNodeId
  readonly to: DeclarativeLinkNodeId
}

/**
 * DeclarativeLinkIR (v1):
 * - JSON serializable, IR-recognizable cross-module dependency graph.
 * - Read side: static ReadQuery only (must include readsDigest, no fallbackReason).
 * - Write side: dispatch only (no direct state writes).
 */
export interface DeclarativeLinkIR {
  readonly version: 1
  readonly nodes: ReadonlyArray<DeclarativeLinkNode>
  readonly edges: ReadonlyArray<DeclarativeLinkEdge>
}

export const getDeclarativeLinkIrDigest = (ir: DeclarativeLinkIR): string =>
  `dlink_ir_v1:${fnv1a32(stableStringify(ir))}`

/**
 * Export envelope compatible with the ConvergeStaticIrCollector bus:
 * - EvidenceCollector indexes by `staticIrDigest`.
 */
export interface DeclarativeLinkIrExport {
  readonly staticIrDigest: string
  readonly moduleId: string
  readonly instanceId: string
  readonly kind: 'declarativeLinkIr'
  readonly ir: DeclarativeLinkIR
}

export const exportDeclarativeLinkIr = (args: { readonly linkId: string; readonly ir: DeclarativeLinkIR }): DeclarativeLinkIrExport => ({
  staticIrDigest: getDeclarativeLinkIrDigest(args.ir),
  moduleId: `link:${args.linkId}`,
  instanceId: 'runtime',
  kind: 'declarativeLinkIr',
  ir: args.ir,
})

