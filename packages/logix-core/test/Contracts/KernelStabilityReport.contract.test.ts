import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as Logix from '../../src/index.js'
import {
  KERNEL_STABILITY_GATE_IDS,
  buildKernelStabilityReport,
  renderKernelStabilityMarkdown,
} from '../../src/internal/runtime/core/KernelStabilityReport.js'

const repoRoot = resolve(__dirname, '../../../..')

describe('KernelStabilityReport internal gate', () => {
  it('keeps exact gate keys and stable JSON-safe ordering', () => {
    expect(KERNEL_STABILITY_GATE_IDS).toEqual([
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
    ])

    const report = buildKernelStabilityReport({
      generatedAt: '2026-05-11T00:00:00.000Z',
      gates: {
        publicSurface: { status: 'PASS', evidenceRefs: ['CoreRootBarrel.allowlist'] },
        diagnosticsOffCost: {
          status: 'UNKNOWN',
          note: 'No comparable diagnostics-off perf artifact provided.',
        },
      },
    })

    expect(Object.keys(report.gates)).toEqual(KERNEL_STABILITY_GATE_IDS)
    expect(JSON.parse(JSON.stringify(report))).toEqual(report)
    expect(report.gates.publicSurface).toEqual({
      id: 'publicSurface',
      status: 'PASS',
      evidenceRefs: ['CoreRootBarrel.allowlist'],
    })
    expect(report.gates.diagnosticsOffCost).toEqual({
      id: 'diagnosticsOffCost',
      status: 'UNKNOWN',
      note: 'No comparable diagnostics-off perf artifact provided.',
    })
    expect(report.gates.selectorPrecision.status).toBe('UNKNOWN')
    expect((report as any).perfBroadStrict).toBeUndefined()
  })

  it('renders Markdown without converting UNKNOWN into PASS or perf success claims', () => {
    const report = buildKernelStabilityReport({
      generatedAt: '2026-05-11T00:00:00.000Z',
      gates: {
        selectorPrecision: { status: 'PASS', evidenceRefs: ['ReactSelectorRouteOwner.guard'] },
      },
    })
    const markdown = renderKernelStabilityMarkdown(report)

    expect(markdown).toContain('# Kernel Stability Report')
    expect(markdown).toContain('| selectorPrecision | PASS | ReactSelectorRouteOwner.guard |  |')
    expect(markdown).toContain('| diagnosticsOffCost | UNKNOWN |  | No comparable diagnostics-off perf artifact provided. |')
    expect(markdown).toContain('UNKNOWN is not PASS')
    expect(markdown).not.toMatch(/perfBroadStrict\s*\|\s*PASS/)
    expect(markdown).not.toMatch(/performance improvement/i)
  })

  it('keeps report model internal and unavailable from public root exports', () => {
    expect((Logix as any).KernelStabilityReport).toBeUndefined()
  })

  it('dry-run script prints deterministic JSON with UNKNOWN where evidence is absent', () => {
    const output = execFileSync('node', ['scripts/kernel-stability-report.mjs', '--dry-run'], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
    const parsed = JSON.parse(output)

    expect(parsed.generatedAt).toBe('dry-run')
    expect(Object.keys(parsed.gates)).toEqual(KERNEL_STABILITY_GATE_IDS)
    expect(parsed.gates.publicSurface.status).toBe('UNKNOWN')
    expect(parsed.gates.diagnosticsOffCost.status).toBe('UNKNOWN')
    expect(parsed.gates.diagnosticsOffCost.note).toContain('No comparable diagnostics-off perf artifact')
  })

  it('documents gate filling rules without treating UNKNOWN as PASS', () => {
    const template = 'docs/next/kernel-stability-report-template.md'
    expect(existsSync(resolve(repoRoot, template))).toBe(true)
    const source = readFileSync(resolve(repoRoot, template), 'utf8')

    for (const gateId of KERNEL_STABILITY_GATE_IDS) {
      expect(source).toContain(`\`${gateId}\``)
    }
    expect(source).toContain('UNKNOWN is not PASS')
    expect(source).toContain('no broad performance success claim')
    expect(source).toContain('Do not run benchmark suites')
  })
})
