#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const artifact = args.includes('--artifact') ? args[args.indexOf('--artifact') + 1] : undefined

const requiredSuites = [
  'negativeBoundaries.dirtyPattern',
  'converge.txnCommit',
  'form.listScopeCheck',
  'externalStore.ingest.tickNotify',
  'runtimeStore.noTearing.tickNotify',
  'react.strictSuspenseJitter',
]

const fail = (message) => {
  console.error(`[final-cutover-perf] ${message}`)
  process.exitCode = 1
}

if (!artifact || !existsSync(artifact)) {
  fail('missing --artifact <perf-summary.json|md>')
  process.exit()
}

const text = readFileSync(artifact, 'utf8')
const lower = text.toLowerCase()

for (const suite of requiredSuites) {
  if (!text.includes(suite)) fail(`artifact does not mention required suite: ${suite}`)
}

if (/comparable\s*[:=]\s*false/i.test(text)) fail('artifact is not comparable')
if (/stabilitywarning/i.test(text)) fail('artifact contains stability warning')
if (/timeout/i.test(text)) fail('artifact contains timeout')
if (/missing suite|missing_suites|missingSuites/i.test(text)) fail('artifact contains missing suite marker')
if (/budgetExceeded\s*[:=]\s*[1-9]/i.test(text)) fail('artifact reports budgetExceeded > 0')
if (/has_regressions/i.test(text)) fail('artifact reports has_regressions')

if (process.exitCode !== 1) {
  console.log(`[final-cutover-perf] pass: ${artifact}`)
}
