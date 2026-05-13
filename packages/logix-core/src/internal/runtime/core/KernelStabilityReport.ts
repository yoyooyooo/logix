export const KERNEL_STABILITY_GATE_IDS = [
  'publicSurface',
  'authoringSpine',
  'fieldDeclarationCompiler',
  'runtimeLifecycle',
  'transactionSafety',
  'selectorPrecision',
  'diagnosticsOffCost',
  'controlPlaneShape',
  'domainBoundary',
  'legacyResidueSweep',
] as const

export type KernelStabilityGateId = (typeof KERNEL_STABILITY_GATE_IDS)[number]
export type KernelStabilityGateStatus = 'PASS' | 'FAIL' | 'UNKNOWN'

export interface KernelStabilityGateResult {
  readonly id: KernelStabilityGateId
  readonly status: KernelStabilityGateStatus
  readonly evidenceRefs?: ReadonlyArray<string>
  readonly note?: string
}

export interface KernelStabilityReport {
  readonly kind: 'KernelStabilityReport'
  readonly schemaVersion: 1
  readonly generatedAt: string
  readonly gates: Record<KernelStabilityGateId, KernelStabilityGateResult>
  readonly policy: {
    readonly noBroadPerformanceClaim: true
    readonly benchmarkSuitesRequired: false
    readonly unknownIsPass: false
  }
}

export type KernelStabilityGateInput = Readonly<{
  readonly status?: KernelStabilityGateStatus
  readonly evidenceRefs?: ReadonlyArray<string>
  readonly note?: string
}>

export interface BuildKernelStabilityReportInput {
  readonly generatedAt?: string
  readonly gates?: Partial<Record<KernelStabilityGateId, KernelStabilityGateInput>>
}

const DEFAULT_GATE_NOTES: Record<KernelStabilityGateId, string> = {
  publicSurface: 'No passing public surface guard evidence provided.',
  authoringSpine: 'No passing authoring spine guard evidence provided.',
  fieldDeclarationCompiler: 'No passing field declaration compiler guard evidence provided.',
  runtimeLifecycle: 'No passing runtime lifecycle guard evidence provided.',
  transactionSafety: 'No passing transaction safety guard evidence provided.',
  selectorPrecision: 'No passing selector precision guard evidence provided.',
  diagnosticsOffCost: 'No comparable diagnostics-off perf artifact provided.',
  controlPlaneShape: 'No passing control plane shape guard evidence provided.',
  domainBoundary: 'No passing domain boundary guard evidence provided.',
  legacyResidueSweep: 'No passing legacy residue sweep guard evidence provided.',
}

const normalizeEvidenceRefs = (refs: ReadonlyArray<string> | undefined): ReadonlyArray<string> | undefined => {
  if (!Array.isArray(refs) || refs.length === 0) return undefined
  const next = Array.from(
    new Set(refs.filter((ref): ref is string => typeof ref === 'string' && ref.length > 0)),
  ).sort()
  return next.length > 0 ? next : undefined
}

const normalizeStatus = (status: unknown): KernelStabilityGateStatus =>
  status === 'PASS' || status === 'FAIL' || status === 'UNKNOWN' ? status : 'UNKNOWN'

const buildGateResult = (
  id: KernelStabilityGateId,
  input: KernelStabilityGateInput | undefined,
): KernelStabilityGateResult => {
  const status = normalizeStatus(input?.status)
  const evidenceRefs = normalizeEvidenceRefs(input?.evidenceRefs)
  const note = typeof input?.note === 'string' && input.note.length > 0 ? input.note : status === 'UNKNOWN' ? DEFAULT_GATE_NOTES[id] : undefined

  return {
    id,
    status,
    ...(evidenceRefs ? { evidenceRefs } : null),
    ...(note ? { note } : null),
  }
}

export const buildKernelStabilityReport = (
  input: BuildKernelStabilityReportInput = {},
): KernelStabilityReport => {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString()
  const gates = {} as Record<KernelStabilityGateId, KernelStabilityGateResult>

  for (const id of KERNEL_STABILITY_GATE_IDS) {
    gates[id] = buildGateResult(id, input.gates?.[id])
  }

  return {
    kind: 'KernelStabilityReport',
    schemaVersion: 1,
    generatedAt,
    gates,
    policy: {
      noBroadPerformanceClaim: true,
      benchmarkSuitesRequired: false,
      unknownIsPass: false,
    },
  }
}

const renderCell = (value: unknown): string => {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'string') return value
  return ''
}

export const renderKernelStabilityMarkdown = (report: KernelStabilityReport): string => {
  const lines = [
    '# Kernel Stability Report',
    '',
    `- Schema: ${report.schemaVersion}`,
    `- Generated at: ${report.generatedAt}`,
    '- UNKNOWN is not PASS.',
    '- This gate makes no broad performance success claim.',
    '',
    '| Gate | Status | Evidence | Note |',
    '| --- | --- | --- | --- |',
  ]

  for (const id of KERNEL_STABILITY_GATE_IDS) {
    const gate = report.gates[id]
    lines.push(`| ${id} | ${gate.status} | ${renderCell(gate.evidenceRefs)} | ${renderCell(gate.note)} |`)
  }

  return `${lines.join('\n')}\n`
}
