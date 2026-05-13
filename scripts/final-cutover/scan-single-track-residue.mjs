#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const repo = process.cwd()
const args = new Set(process.argv.slice(2))
const format = process.argv.includes('--format') ? process.argv[process.argv.indexOf('--format') + 1] : 'text'
const profile = process.argv.includes('--profile') ? process.argv[process.argv.indexOf('--profile') + 1] : 'all'

const forbidden = [
  { token: '@logixjs/form/react', reason: 'Form-owned React host route' },
  { token: 'useFormSelector', reason: 'Form-owned React selector family' },
  { token: 'useFieldSource', reason: 'Form-owned source read hook' },
  { token: 'useCompanion', reason: 'Form-owned companion hook' },
  { token: 'useFieldArray', reason: 'Form-owned field array hook' },
  { token: 'useField(', reason: 'Form-owned field hook' },
  { token: 'useForm(', reason: 'Form-owned form hook' },
  { token: 'Form.Source', reason: 'Form-owned source namespace' },
  { token: 'Form.Path', reason: 'Form-owned path namespace' },
  { token: 'Form.SchemaPathMapping', reason: 'public schema path mapping helper' },
  { token: 'Form.SchemaErrorMapping', reason: 'public schema error mapping helper' },
  { token: 'Form.Row', reason: 'public row token namespace' },
  { token: 'Form.Fact', reason: 'generic fact namespace' },
  { token: 'Form.SoftFact', reason: 'generic soft fact namespace' },
  { token: 'Form.from', reason: 'old declaration route' },
  { token: '.options(', reason: 'source/options API confusion' },
  { token: 'source.refresh', reason: 'Form-owned source refresh helper' },
  { token: 'ScenarioReport', reason: 'second report object hazard' },
]

const currentAuthorityFiles = new Set([
  'docs/ssot/form/13-exact-surface-contract.md',
  'docs/ssot/form/14-final-single-track-cutover-gate.md',
  'docs/standards/final-single-track-cutover.md',
  'specs/229-form-kernel-final-single-track-cutover/spec.md',
])

const ignoreDirs = new Set(['.git', 'node_modules', 'dist', 'coverage', '.turbo', '.next', 'tmp'])
const textExt = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.md', '.mdx', '.json'])

const rootsForProfile = (profile) => {
  if (profile === 'docs') return ['docs', 'specs', 'examples']
  if (profile === 'source') return ['packages', 'examples']
  return ['docs', 'specs', 'packages', 'examples']
}

const hasTraceOnlyTombstone = (content) => {
  const head = content.slice(0, 1600)
  return /Trace-only|trace-only|superseded|Final authority note|Final cutover note|Current authority/i.test(head)
}

const isHistoricalPath = (rel) => {
  return rel.startsWith('docs/proposals/') || rel.startsWith('docs/archive/') || rel.startsWith('specs/') || rel.includes('/candidate-') || rel.includes('/challenge-')
}

const isAllowedInternalFormPath = (rel, token) => {
  if (!rel.startsWith('packages/logix-form/src/internal/')) return false
  if (token.includes('SchemaPathMapping') || token.includes('SchemaErrorMapping') || token === '.options(') return true
  return false
}

const walk = (dir, out = []) => {
  let entries = []
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, out)
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name)
    if (!textExt.has(ext)) continue
    out.push(full)
  }
  return out
}

const files = rootsForProfile(profile).flatMap((root) => walk(path.join(repo, root)))
const violations = []

for (const full of files) {
  const rel = path.relative(repo, full).replaceAll(path.sep, '/')
  let content = ''
  try { content = readFileSync(full, 'utf8') } catch { continue }
  const historical = isHistoricalPath(rel)
  const authority = currentAuthorityFiles.has(rel)
  const tombstoned = hasTraceOnlyTombstone(content)

  for (const rule of forbidden) {
    if (!content.includes(rule.token)) continue
    if (authority) continue
    if (isAllowedInternalFormPath(rel, rule.token)) continue
    if (historical && tombstoned) continue
    // Tests may mention forbidden tokens only when their filename indicates guard/negative-space ownership.
    if (/\.(guard|boundary|negative|allowlist|contract)\.test\.(ts|tsx|mts|cts)$/.test(rel)) continue
    violations.push({ file: rel, token: rule.token, reason: rule.reason, historical, tombstoned })
  }
}

if (format === 'json') {
  console.log(JSON.stringify({ ok: violations.length === 0, violations }, null, 2))
} else {
  if (violations.length === 0) {
    console.log(`[single-track-residue] ok (profile=${profile}, files=${files.length})`)
  } else {
    console.error(`[single-track-residue] ${violations.length} violation(s) (profile=${profile})`)
    for (const v of violations) {
      console.error(`- ${v.file}: ${v.token} (${v.reason})`)
    }
  }
}

process.exitCode = violations.length === 0 ? 0 : 1
