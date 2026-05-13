#!/usr/bin/env node

const gateIds = [
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
]

const defaultNotes = {
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

const normalizeStatus = (status) =>
  status === 'PASS' || status === 'FAIL' || status === 'UNKNOWN' ? status : 'UNKNOWN'

const normalizeEvidenceRefs = (refs) => {
  if (!Array.isArray(refs) || refs.length === 0) return undefined
  const out = Array.from(new Set(refs.filter((ref) => typeof ref === 'string' && ref.length > 0))).sort()
  return out.length > 0 ? out : undefined
}

const buildReport = ({ generatedAt = new Date(0).toISOString(), gates: inputGates = {} } = {}) => {
  const gates = {}
  for (const id of gateIds) {
    const input = inputGates[id] ?? {}
    const status = normalizeStatus(input.status)
    const evidenceRefs = normalizeEvidenceRefs(input.evidenceRefs)
    const note =
      typeof input.note === 'string' && input.note.length > 0
        ? input.note
        : status === 'UNKNOWN'
          ? defaultNotes[id]
          : undefined

    gates[id] = {
      id,
      status,
      ...(evidenceRefs ? { evidenceRefs } : null),
      ...(note ? { note } : null),
    }
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

const renderMarkdown = (report) => {
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
  for (const id of gateIds) {
    const gate = report.gates[id]
    lines.push(`| ${id} | ${gate.status} | ${(gate.evidenceRefs ?? []).join(', ')} | ${gate.note ?? ''} |`)
  }
  return `${lines.join('\n')}\n`
}

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const markdown = argv.includes('--markdown')

const report = buildReport({
  generatedAt: dryRun ? 'dry-run' : new Date(0).toISOString(),
})

process.stdout.write(markdown ? renderMarkdown(report) : `${JSON.stringify(report, null, 2)}\n`)
