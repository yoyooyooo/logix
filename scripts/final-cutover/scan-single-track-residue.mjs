#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const repoRoot = process.cwd()
const args = process.argv.slice(2)

const readArg = (name, fallback) => {
  const idx = args.indexOf(name)
  if (idx < 0) return fallback
  return args[idx + 1] ?? fallback
}

const profile = readArg('--profile', 'all')
const format = readArg('--format', 'table')

const profiles = new Set(['all', 'docs', 'source', 'form', 'examples'])
if (!profiles.has(profile)) {
  console.error(`[single-track-residue] unknown --profile ${profile}`)
  process.exit(2)
}

const asPosix = (path) => path.split('\\').join('/')
const relPath = (abs) => asPosix(relative(repoRoot, abs))

const existsRel = (path) => existsSync(resolve(repoRoot, path))
const readRel = (path) => readFileSync(resolve(repoRoot, path), 'utf8')

const textFileRe = /\.(md|mdx|ts|tsx|js|jsx|mjs|cjs)$/i
const scanRoots = {
  docs: [
    'docs/ssot/form',
    'docs/ssot/runtime',
    'docs/standards',
    'docs/internal',
    'docs/next/form-kernel-final-single-track-cutover.md',
    'docs/next/form-kernel-final-single-track-cutover-report.md',
  ],
  source: [
    'packages/logix-form/src',
    'packages/logix-react/src',
    'packages/logix-query/src',
    'packages/logix-core/src',
  ],
  examples: [
    'examples/logix-react/src/demos/form',
    'examples/logix-react/src/modules',
  ],
  form: [
    'packages/logix-form/src',
    'packages/logix-form/test/Contracts',
    'packages/logix-form/test/Form',
  ],
}

const selectedRoots = (() => {
  if (profile === 'all') return [...scanRoots.docs, ...scanRoots.source, ...scanRoots.examples]
  return scanRoots[profile] ?? []
})()

const forbiddenRootFiles = [
  'packages/logix-form/src/Path.ts',
  'packages/logix-form/src/Source.ts',
  'packages/logix-form/src/Row.ts',
  'packages/logix-form/src/Fact.ts',
  'packages/logix-form/src/SoftFact.ts',
  'packages/logix-form/src/SchemaPathMapping.ts',
  'packages/logix-form/src/SchemaErrorMapping.ts',
]

const forbiddenPackageSubpaths = [
  './Path',
  './Source',
  './Row',
  './Fact',
  './SoftFact',
  './SchemaPathMapping',
  './SchemaErrorMapping',
  './react',
]

const forbiddenPatterns = [
  { label: '@logixjs/form/react', re: /@logixjs\/form\/react/ },
  { label: 'Form.Source', re: /\bForm\.Source\b/ },
  { label: 'Form.Path', re: /\bForm\.Path\b/ },
  { label: 'Form.SchemaPathMapping', re: /\bForm\.SchemaPathMapping\b/ },
  { label: 'Form.SchemaErrorMapping', re: /\bForm\.SchemaErrorMapping\b/ },
  { label: 'Form.Row', re: /\bForm\.Row\b/ },
  { label: 'Form.Fact', re: /\bForm\.Fact\b/ },
  { label: 'Form.SoftFact', re: /\bForm\.SoftFact\b/ },
  { label: 'Form.from', re: /\bForm\.from\b/ },
  { label: 'field.options', re: /\bfield\s*\(.*\)\s*\.options\b|\bfield\.options\b/ },
  { label: 'source.refresh', re: /\bsource\.refresh\b/ },
  { label: 'useFieldSource', re: /\buseFieldSource\b/ },
  { label: 'useFormSelector', re: /\buseFormSelector\b/ },
  { label: 'useCompanion', re: /\buseCompanion\b/ },
  { label: 'useFieldArray', re: /\buseFieldArray\b/ },
  { label: 'useField', re: /\buseField\b/ },
  { label: 'useForm', re: /\buseForm\b/ },
  { label: 'compatibility shim', re: /compatibility shim/i },
  { label: 'deprecation shell', re: /deprecation shell/i },
  { label: 'dual-write path', re: /dual-write path/i },
  { label: 'shadow path', re: /shadow path/i },
  { label: 'watch-only residue', re: /watch-only residue/i },
  { label: 'legacy public alias', re: /legacy public alias/i },
]

const negativeOrTraceContext = /trace-only|superseded|historical|history|archive|forbidden|rejected|negative|must not|must be absent|not expose|not public|not admitted|not alternate|not as current|do not use|absence|guard|No capability is allowed|No `|No \b|no public|no package|no manual|cannot become|does not own|不开放|退出|拒绝|禁止|不得|不能|不再|不属于|不构成|不允许|只作为历史|当前不|全部退出|Compatibility Ban|Required Absence Matrix|Rejected alternatives/i

const pathAllowsForbiddenMentions = (path) => {
  if (path.includes('/test/')) return true
  if (path.startsWith('docs/standards/')) return true
  if (path.endsWith('docs/ssot/form/14-final-single-track-cutover-gate.md')) return true
  if (path.endsWith('docs/ssot/form/13-exact-surface-contract.md')) return true
  if (path.endsWith('docs/next/form-live-residue-cutover-plan.md')) return true
  if (path.endsWith('docs/next/form-kernel-final-single-track-cutover.md')) return true
  if (path.startsWith('specs/229-form-kernel-final-single-track-cutover/')) return true
  return false
}

const isTraceOnlyFile = (text) => text.slice(0, 1600).includes('Trace-only / superseded')

const shouldIgnoreLineHit = (path, text, line, lineIndex) => {
  if (isTraceOnlyFile(text)) return true

  if (
    path === 'docs/next/form-kernel-final-single-track-cutover-report.md' &&
    /packages\/[^`|\s]+\/test\/[^`|\s]+/.test(line)
  ) {
    return true
  }

  const lines = text.split(/\r?\n/)
  const context = lines
    .slice(Math.max(0, lineIndex - 40), Math.min(lines.length, lineIndex + 10))
    .join('\n')

  if (pathAllowsForbiddenMentions(path) && (negativeOrTraceContext.test(line) || negativeOrTraceContext.test(context))) {
    return true
  }

  if ((path.startsWith('docs/ssot/') || path.startsWith('docs/internal/')) && negativeOrTraceContext.test(context)) {
    return true
  }

  if (path.startsWith('packages/logix-core/src/internal/') || path.startsWith('packages/logix-query/src/internal/') || path.startsWith('packages/logix-form/src/internal/')) {
    return true
  }

  if (/forbidden|rejected|required.*absence|not\.to|expect\(|toContain|toMatch|forbidden/i.test(line) && path.includes('/test/')) {
    return true
  }
  return false
}

const listFiles = (rootPath) => {
  const abs = resolve(repoRoot, rootPath)
  if (!existsSync(abs)) return []
  const stat = statSync(abs)
  if (stat.isFile()) return textFileRe.test(abs) ? [abs] : []
  if (!stat.isDirectory()) return []
  const out = []
  const visit = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      const st = statSync(full)
      if (st.isDirectory()) {
        if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue
        visit(full)
        continue
      }
      if (st.isFile() && textFileRe.test(entry)) out.push(full)
    }
  }
  visit(abs)
  return out
}

const violations = []
const scannedFiles = new Set()

for (const file of forbiddenRootFiles) {
  if (existsRel(file)) {
    violations.push({ kind: 'forbidden-public-file', file, label: file, line: 0, text: 'legacy public root file exists' })
  }
}

for (const pkgPath of ['packages/logix-form/package.json']) {
  if (!existsRel(pkgPath)) continue
  try {
    const pkg = JSON.parse(readRel(pkgPath))
    const exportMaps = [pkg.exports, pkg.publishConfig?.exports].filter(Boolean)
    for (const exportsMap of exportMaps) {
      for (const subpath of forbiddenPackageSubpaths) {
        if (Object.prototype.hasOwnProperty.call(exportsMap, subpath)) {
          violations.push({ kind: 'forbidden-package-export', file: pkgPath, label: subpath, line: 0, text: `${subpath} export exists` })
        }
      }
    }
  } catch (error) {
    violations.push({ kind: 'package-json-parse', file: pkgPath, label: 'package.json', line: 0, text: String(error?.message ?? error) })
  }
}

for (const root of selectedRoots) {
  for (const abs of listFiles(root)) {
    const file = relPath(abs)
    scannedFiles.add(file)
    const text = readFileSync(abs, 'utf8')
    const lines = text.split(/\r?\n/)
    for (let idx = 0; idx < lines.length; idx += 1) {
      const line = lines[idx]
      for (const pattern of forbiddenPatterns) {
        if (!pattern.re.test(line)) continue
        if (shouldIgnoreLineHit(file, text, line, idx)) continue
        violations.push({ kind: 'forbidden-current-narrative', file, label: pattern.label, line: idx + 1, text: line.trim() })
      }
    }
  }
}

const report = {
  schemaVersion: 1,
  kind: 'FinalSingleTrackResidueScanReport',
  profile,
  scannedFiles: scannedFiles.size,
  violations,
  pass: violations.length === 0,
}

if (format === 'json') {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
} else {
  process.stdout.write(`[single-track-residue] profile=${profile} scannedFiles=${report.scannedFiles} violations=${violations.length}\n`)
  if (violations.length > 0) {
    for (const v of violations) {
      process.stdout.write(`- ${v.kind} ${v.file}${v.line ? `:${v.line}` : ''} [${v.label}] ${v.text}\n`)
    }
  }
}

process.exitCode = report.pass ? 0 : 1
