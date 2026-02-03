import { createHash } from 'node:crypto'

import type { Span } from '../span.js'
import type { PatchOperationKind, PropertyWrite } from './model.js'

const stableSpan = (span: Span) => ({
  start: {
    line: span.start.line,
    column: span.start.column,
    offset: span.start.offset,
  },
  end: {
    line: span.end.line,
    column: span.end.column,
    offset: span.end.offset,
  },
})

export const opKeyOf = (input: {
  readonly kind: PatchOperationKind
  readonly file: string
  readonly targetSpan: Span
  readonly property: PropertyWrite
}): string => {
  const payload = {
    kind: input.kind,
    file: input.file,
    targetSpan: stableSpan(input.targetSpan),
    property: {
      name: input.property.name,
      valueCode: input.property.valueCode,
    },
  }

  const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16)
  return `${input.kind}:${hash}`
}

