import fs from 'node:fs'
import path from 'node:path'

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'))

const cwd = process.cwd()
const exportRunId = 'smoke-ir'
const trialRunId = 'smoke-trialrun'

const manifestPath = path.join(cwd, '.logix', 'out', 'ir.export', exportRunId, 'control-surface.manifest.json')
const trialRunPath = path.join(cwd, '.logix', 'out', 'trialrun', trialRunId, 'trialrun.report.json')
const outPath = path.join(cwd, '.logix', 'out', 'smoke', 'ir.consistency.report.json')

if (!fs.existsSync(manifestPath) || !fs.existsSync(trialRunPath)) {
  const missing = [manifestPath, trialRunPath].filter((item) => !fs.existsSync(item))
  process.stderr.write(`[ir-consistency-smoke] missing inputs:\n${missing.join('\n')}\n`)
  process.exitCode = 1
  process.exit(1)
}

const manifest = readJson(manifestPath)
const trialRun = readJson(trialRunPath)
const trialManifest = trialRun?.manifest ?? {}

const exportDigest = typeof manifest?.digest === 'string' ? manifest.digest : undefined
const trialDigest = typeof trialManifest?.digest === 'string' ? trialManifest.digest : undefined
const digestDomain = (digest) => {
  if (typeof digest !== 'string') return undefined
  const idx = digest.indexOf(':')
  return idx > 0 ? digest.slice(0, idx) : undefined
}

const exportDomain = digestDomain(exportDigest)
const trialDomain = digestDomain(trialDigest)
const digestMatch =
  Boolean(exportDigest && trialDigest) &&
  (exportDomain && trialDomain && exportDomain === trialDomain ? exportDigest === trialDigest : true)

const exportModuleIds = Array.isArray(manifest?.modules)
  ? manifest.modules
      .map((item) => (typeof item?.moduleId === 'string' ? item.moduleId : undefined))
      .filter((item) => typeof item === 'string')
  : []
const trialModuleId = typeof trialManifest?.moduleId === 'string' ? trialManifest.moduleId : undefined
const moduleIdMatch = exportModuleIds.length === 1 && typeof trialModuleId === 'string' && exportModuleIds[0] === trialModuleId

const toWorkflowMap = (value) => {
  const modules = Array.isArray(value?.modules) ? value.modules : []
  const map = new Map()
  for (const item of modules) {
    const moduleId = typeof item?.moduleId === 'string' ? item.moduleId : undefined
    const digest = typeof item?.workflowSurface?.digest === 'string' ? item.workflowSurface.digest : undefined
    if (moduleId && digest) map.set(moduleId, digest)
  }
  return map
}

const exportWorkflow = toWorkflowMap(manifest)
const trialWorkflow = toWorkflowMap(trialManifest)
const workflowMismatches = []
for (const [moduleId, digest] of exportWorkflow.entries()) {
  const trial = trialWorkflow.get(moduleId)
  if (!trial) workflowMismatches.push({ moduleId, reason: 'MISSING_IN_TRIALRUN' })
  else if (trial !== digest) workflowMismatches.push({ moduleId, reason: 'DIGEST_MISMATCH', expected: digest, actual: trial })
}

const report = {
  schemaVersion: 1,
  kind: 'IrConsistencySmokeReport',
  runIds: { irExport: exportRunId, trialrun: trialRunId },
  manifest: {
    exportDigest,
    trialDigest,
    exportDigestDomain: exportDomain,
    trialDigestDomain: trialDomain,
    match: digestMatch,
  },
  moduleIdentity: {
    exportModuleIds,
    trialModuleId,
    match: moduleIdMatch,
  },
  workflowSurface: {
    checked: exportWorkflow.size,
    mismatches: workflowMismatches,
  },
  pass: digestMatch && moduleIdMatch && workflowMismatches.length === 0,
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)

if (report.pass) {
  process.exitCode = 0
} else {
  process.exitCode = 2
}
