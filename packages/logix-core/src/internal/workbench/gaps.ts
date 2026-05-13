import type { RuntimeWorkbenchAuthorityRef } from './authority.js'

export const RUNTIME_WORKBENCH_GAP_CODES = [
  'missing-focus-ref',
  'missing-artifact-output-key',
  'missing-source-digest',
  'digest-mismatch',
  'raw-locator-without-owner',
  'debug-event-without-stable-coordinate',
  'over-budget-evidence',
  'preview-only-host-error',
] as const

export type RuntimeWorkbenchEvidenceGapCode = (typeof RUNTIME_WORKBENCH_GAP_CODES)[number]

export type RuntimeWorkbenchEvidenceGapOwner = 'bundle' | 'session' | 'finding' | 'artifact' | 'source'

export interface RuntimeWorkbenchEvidenceGap {
  readonly id: string
  readonly code: RuntimeWorkbenchEvidenceGapCode | string
  readonly owner: RuntimeWorkbenchEvidenceGapOwner
  readonly authorityRef?: RuntimeWorkbenchAuthorityRef
  readonly derivedFrom?: ReadonlyArray<RuntimeWorkbenchAuthorityRef>
  readonly summary: string
  readonly severity: 'info' | 'warning' | 'error'
}

export const gapSeverity = (code: RuntimeWorkbenchEvidenceGapCode): RuntimeWorkbenchEvidenceGap['severity'] => {
  switch (code) {
    case 'missing-focus-ref':
    case 'missing-artifact-output-key':
    case 'missing-source-digest':
    case 'raw-locator-without-owner':
    case 'debug-event-without-stable-coordinate':
      return 'warning'
    case 'digest-mismatch':
    case 'over-budget-evidence':
    case 'preview-only-host-error':
      return 'error'
  }
}

export const makeRuntimeWorkbenchGap = (args: {
  readonly code: RuntimeWorkbenchEvidenceGapCode
  readonly owner: RuntimeWorkbenchEvidenceGapOwner
  readonly authorityRef?: RuntimeWorkbenchAuthorityRef
  readonly derivedFrom?: ReadonlyArray<RuntimeWorkbenchAuthorityRef>
  readonly detail?: string
}): RuntimeWorkbenchEvidenceGap => {
  const idBase = [
    args.owner,
    args.code,
    args.authorityRef ? `${args.authorityRef.kind}:${args.authorityRef.id}` : '',
    ...(args.derivedFrom ?? []).map((ref) => `${ref.kind}:${ref.id}`),
    args.detail ?? '',
  ]
    .filter(Boolean)
    .join('|')

  return {
    id: `gap:${idBase}`,
    code: args.code,
    owner: args.owner,
    ...(args.authorityRef ? { authorityRef: args.authorityRef } : null),
    ...(args.derivedFrom ? { derivedFrom: args.derivedFrom } : null),
    summary: gapSummary(args.code, args.detail),
    severity: gapSeverity(args.code),
  }
}

const gapSummary = (code: RuntimeWorkbenchEvidenceGapCode, detail: string | undefined): string => {
  const suffix = detail ? `: ${detail}` : ''
  switch (code) {
    case 'missing-focus-ref':
      return `Missing owner-provided focusRef${suffix}`
    case 'missing-artifact-output-key':
      return `Missing owner-provided artifact output key${suffix}`
    case 'missing-source-digest':
      return `Missing source snapshot digest${suffix}`
    case 'digest-mismatch':
      return `Source digest mismatch${suffix}`
    case 'raw-locator-without-owner':
      return `Raw locator is not coordinate authority${suffix}`
    case 'debug-event-without-stable-coordinate':
      return `Debug event is missing stable runtime coordinate${suffix}`
    case 'over-budget-evidence':
      return `Evidence is over budget${suffix}`
    case 'preview-only-host-error':
      return `Preview-only host error has no Logix evidence authority${suffix}`
  }
}
