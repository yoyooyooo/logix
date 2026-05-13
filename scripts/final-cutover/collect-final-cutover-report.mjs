#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const args = process.argv.slice(2)
const readArg = (name, fallback) => {
  const idx = args.indexOf(name)
  if (idx < 0) return fallback
  return args[idx + 1] ?? fallback
}
const readArgs = (name) => {
  const out = []
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name && args[i + 1]) out.push(args[i + 1])
  }
  return out
}

const outPath = readArg('--out', 'docs/next/form-kernel-final-single-track-cutover-report.md')
const perfArtifacts = readArgs('--perf-artifact')
const requirePerf = args.includes('--require-perf')
const repoRoot = process.cwd()

const requiredHotPaths = [
  'negativeBoundaries.dirtyPattern',
  'converge.txnCommit',
  'form.listScopeCheck',
  'externalStore.ingest.tickNotify',
  'runtimeStore.noTearing.tickNotify',
  'react.strictSuspenseJitter',
]

const requiredWitnessFiles = [
  'packages/logix-form/test/Contracts/FormFinalSingleTrackPublicSurface.guard.test.ts',
  'packages/logix-form/test/Contracts/FormFinalOwnerCollisionWitness.guard.test.ts',
  'packages/logix-form/test/Form/Form.SourceCompanion.RequiredWitnesses.test.ts',
  'packages/logix-form/test/Form/Form.Source.Authoring.test.ts',
  'packages/logix-form/test/Form/Form.Source.NotOptionsApi.guard.test.ts',
  'packages/logix-form/test/Form/Form.Source.RowScope.Authoring.test.ts',
  'packages/logix-form/test/Form/Form.Companion.NoAsyncGuard.test.ts',
  'packages/logix-form/test/Form/Form.Companion.RowIdContinuity.test.ts',
  'packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts',
  'packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts',
  'packages/logix-form/test/Form/Form.ReadRoute.CoreSelectorOnly.guard.test.ts',
  'packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx',
  'packages/logix-query/test/Query/QueryFormSourceOwnerBoundary.guard.test.ts',
  'packages/logix-core/test/Contracts/KernelFallbackReason.contract.test.ts',
  'packages/logix-core/test/Contracts/VerificationCompareFinalCutover.guard.test.ts',
  'packages/logix-perf-evidence/scripts/ci.final-cutover-gate.mjs',
]

const runScanner = () => {
  try {
    const raw = execFileSync(
      process.execPath,
      ['scripts/final-cutover/scan-single-track-residue.mjs', '--profile', 'all', '--format', 'json'],
      { cwd: repoRoot, encoding: 'utf8' },
    )
    return { ok: true, report: JSON.parse(raw) }
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout : String(error?.stdout ?? '')
    let report
    try {
      report = JSON.parse(stdout)
    } catch {
      report = { pass: false, violations: [], raw: stdout, error: String(error?.message ?? error) }
    }
    return { ok: false, report }
  }
}

const inspectPerfArtifact = (artifact) => {
  const abs = resolve(repoRoot, artifact)
  if (!existsSync(abs)) return { artifact, exists: false, pass: false, reasons: ['missing artifact'] }
  const text = readFileSync(abs, 'utf8')
  const reasons = []
  for (const suite of requiredHotPaths) {
    if (!text.includes(suite)) reasons.push(`missing required hot path: ${suite}`)
  }
  if (/comparable\s*[:=]\s*false/i.test(text)) reasons.push('comparable=false')
  if (/stabilityWarning/i.test(text)) reasons.push('stability warning')
  if (/timeout/i.test(text)) reasons.push('timeout')
  if (/missing suite|missing_suites|missingSuites/i.test(text)) reasons.push('missing suite marker')
  if (/budgetExceeded\s*[:=]\s*[1-9]/i.test(text)) reasons.push('budgetExceeded > 0')
  if (/has_regressions/i.test(text)) reasons.push('has_regressions')
  return { artifact, exists: true, pass: reasons.length === 0, reasons }
}

const scanner = runScanner()
const witnessRows = requiredWitnessFiles.map((path) => ({ path, exists: existsSync(resolve(repoRoot, path)) }))
const missingWitnesses = witnessRows.filter((row) => !row.exists)
const perfRows = perfArtifacts.map(inspectPerfArtifact)
const missingOrFailedPerf = perfRows.filter((row) => !row.pass)
const perfCollected = perfRows.length > 0

const blockedReasons = []
if (!scanner.report?.pass) blockedReasons.push('residue scanner failed')
if (missingWitnesses.length > 0) blockedReasons.push('required witness file missing')
if (perfCollected && missingOrFailedPerf.length > 0) blockedReasons.push('perf artifact failed evidence policy')
if (requirePerf && !perfCollected) blockedReasons.push('required performance artifact missing')

const classification =
  blockedReasons.length > 0
    ? 'blocked'
    : perfCollected
      ? 'success'
      : 'success_with_limited_evidence'

const hardPerformanceClaim = classification === 'success' && perfCollected

const md = `---
title: Form/Kernel Final Single-Track Cutover Report
status: ${classification}
generated-by: scripts/final-cutover/collect-final-cutover-report.mjs
---

# Form/Kernel Final Single-Track Cutover Report

## Classification

\`${classification}\`

Hard performance claim: \`${hardPerformanceClaim ? 'allowed' : 'not allowed'}\`.

${blockedReasons.length > 0 ? `Blocked reasons:\n\n${blockedReasons.map((reason) => `- ${reason}`).join('\n')}\n` : 'No non-performance blocker was detected by this collector.\n'}

## Residue Scanner

| Field | Value |
| --- | --- |
| pass | ${String(Boolean(scanner.report?.pass))} |
| scannedFiles | ${scanner.report?.scannedFiles ?? 'unknown'} |
| violations | ${Array.isArray(scanner.report?.violations) ? scanner.report.violations.length : 'unknown'} |

${Array.isArray(scanner.report?.violations) && scanner.report.violations.length > 0 ? scanner.report.violations.map((v) => `- ${v.file}${v.line ? `:${v.line}` : ''} [${v.label}] ${v.text}`).join('\n') : 'No residue violations in the scanner scope.'}

## Required Witness Files

| Witness file | Present |
| --- | --- |
${witnessRows.map((row) => `| \`${row.path}\` | ${row.exists ? 'yes' : 'no'} |`).join('\n')}

## Performance Evidence

Required hot paths:

${requiredHotPaths.map((path) => `- \`${path}\``).join('\n')}

${perfRows.length === 0 ? 'No perf artifact was supplied. This report cannot make a hard final performance claim. Re-run with `--perf-artifact <path>` and, for release gating, `--require-perf`.' : perfRows.map((row) => `### ${row.artifact}\n\n- exists: ${row.exists ? 'yes' : 'no'}\n- pass: ${row.pass ? 'yes' : 'no'}\n${row.reasons.length > 0 ? row.reasons.map((reason) => `- ${reason}`).join('\n') : '- no policy violations detected'}`).join('\n\n')}

## Allowed Claims

- Single-track public/document residue is supported only for the scanner scope above.
- Owner-boundary coverage is supported only for the witness files present above.
- Performance release success is ${hardPerformanceClaim ? 'supported by supplied artifact policy checks' : 'not supported without comparable perf artifacts'}.

## Forbidden Claims

- Do not claim final release performance pass without comparable default/soak artifacts.
- Do not treat quick perf output as release-facing proof.
- Do not use this report to re-open Form API shape.
- Do not turn verification reports into a Form authoring API.
`

const absOut = resolve(repoRoot, outPath)
mkdirSync(dirname(absOut), { recursive: true })
writeFileSync(absOut, md, 'utf8')
console.log(`[final-cutover-report] wrote ${outPath} classification=${classification}`)
process.exitCode = blockedReasons.length > 0 ? 1 : 0
