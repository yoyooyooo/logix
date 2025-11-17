import { Schema } from 'effect'

export const ConvergeActionSnippetSchema = Schema.Struct({
  kind: Schema.Literal('provider_override', 'module_override'),
  scope: Schema.String,
  expectedConfigScope: Schema.Literal('provider', 'runtime_module'),
  text: Schema.String,
})
export type ConvergeActionSnippet = Schema.Schema.Type<typeof ConvergeActionSnippetSchema>

export const ConvergeAuditFindingSchema = Schema.Struct({
  id: Schema.String,
  severity: Schema.Literal('info', 'warning', 'error'),
  summary: Schema.String,
  explanation: Schema.String,
  requires: Schema.Struct({
    status: Schema.Literal('ok', 'insufficient_evidence'),
    missingFields: Schema.optional(Schema.Array(Schema.String)),
  }),
  recommendations: Schema.Array(Schema.String),
  snippets: Schema.Array(ConvergeActionSnippetSchema),
})
export type ConvergeAuditFinding = Schema.Schema.Type<typeof ConvergeAuditFindingSchema>

export type ConvergeOrderKey =
  | { readonly kind: 'global'; readonly seq: number }
  | { readonly kind: 'instance'; readonly seq: number }

export const ConvergeOrderKeySchema: Schema.Schema<ConvergeOrderKey> = Schema.Union(
  Schema.Struct({ kind: Schema.Literal('global'), seq: Schema.Number }),
  Schema.Struct({ kind: Schema.Literal('instance'), seq: Schema.Number }),
)

export const ConvergeTxnRowSchema = Schema.Struct({
  moduleId: Schema.String,
  instanceId: Schema.String,
  txnId: Schema.optional(Schema.String),
  txnSeq: Schema.Number,
  eventSeq: Schema.Number,
  timestamp: Schema.Number,
  orderKey: ConvergeOrderKeySchema,
  evidence: Schema.Any,
  downgradeReason: Schema.optional(Schema.String),
})
export type ConvergeTxnRow = Schema.Schema.Type<typeof ConvergeTxnRowSchema>
