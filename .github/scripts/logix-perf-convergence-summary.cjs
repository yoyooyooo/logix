const fs = require('node:fs')
const path = require('node:path')

const perfDir = process.env.PERF_OUT_DIR || 'perf/convergence'
const profile = process.env.PERF_PROFILE || 'default'
const envId = process.env.PERF_ENV_ID || ''
const baseShort = (process.env.BASE_SHORT || '').slice(0, 8)
const headShort = (process.env.HEAD_SHORT || '').slice(0, 8)

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

const mdPath = path.join(perfDir, 'summary.md')
const diffPath = baseShort && headShort && envId ? path.join(perfDir, `diff.${baseShort}__${headShort}.${envId}.${profile}.json`) : ''
const adversarialPath = path.join(perfDir, `adversarial.${profile}.json`)
const examplesPath = path.join(perfDir, `examples-playground.${profile}.json`)
const convergencePath = path.join(perfDir, `convergence.${profile}.json`)

const diff = readJson(diffPath)
const adversarial = readJson(adversarialPath)
const examples = readJson(examplesPath)
const convergence = readJson(convergencePath)

const lines = [
  '### logix-perf convergence',
  '',
  `- profile: \`${profile}\``,
  `- envId: \`${envId || 'missing'}\``,
  `- base/head: \`${baseShort || 'missing'}\` -> \`${headShort || 'missing'}\``,
  `- diff: comparable=\`${String(diff?.meta?.comparability?.comparable ?? diff?.comparable ?? 'missing')}\`, regressions=\`${String(diff?.summary?.regressions ?? 'missing')}\`, budgetExceeded=\`${String(diff?.summary?.budgetExceeded ?? diff?.summary?.budgetViolations ?? 'missing')}\`, timeouts=\`${String(diff?.summary?.timeouts ?? 'missing')}\`, missingSuites=\`${String(diff?.summary?.missingSuites ?? 'missing')}\`, stabilityWarnings=\`${String(diff?.summary?.stabilityWarnings ?? 'missing')}\``,
  `- adversarial: classification=\`${String(adversarial?.classification ?? 'missing')}\`, claimStrength=\`${String(adversarial?.claimStrength ?? 'missing')}\``,
  `- examples/playground: classification=\`${String(examples?.classification ?? 'missing')}\`, claimStrength=\`${String(examples?.claimStrength ?? 'missing')}\``,
  `- final gate: classification=\`${String(convergence?.classification ?? 'missing')}\`, claimStrength=\`${String(convergence?.claimStrength ?? 'missing')}\``,
  '',
  'Artifact root:',
  '',
  `\`${perfDir}\``,
  '',
]

if (Array.isArray(convergence?.blockers) && convergence.blockers.length > 0) {
  lines.push('Top blockers:', '')
  for (const blocker of convergence.blockers.slice(0, 12)) lines.push(`- ${blocker}`)
  lines.push('')
}

fs.mkdirSync(perfDir, { recursive: true })
fs.writeFileSync(mdPath, `${lines.join('\n')}\n`, 'utf8')

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`, 'utf8')
}

console.log(`[logix-perf] wrote convergence summary: ${mdPath}`)
