import type { Span } from '../span.js'
import type { PatchOperationInput } from '../rewriter/model.js'
import type { AutofillAnchorKind } from './model.js'
import { metaReasonCodes } from './policy.js'

export const addObjectPropertyOp = (args: {
  readonly file: string
  readonly targetId: string
  readonly anchorKind: AutofillAnchorKind
  readonly targetSpan: Span
  readonly propertyName: string
  readonly valueCode: string
}): PatchOperationInput => ({
  kind: 'AddObjectProperty',
  file: args.file,
  targetSpan: args.targetSpan,
  property: { name: args.propertyName, valueCode: args.valueCode },
  reasonCodes: metaReasonCodes({ targetId: args.targetId, anchorKind: args.anchorKind }),
})

