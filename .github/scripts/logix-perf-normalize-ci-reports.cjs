const fs = require('node:fs')
const crypto = require('node:crypto')

const usage = () => `\
Usage:
  node .github/scripts/logix-perf-normalize-ci-reports.cjs \\
    --before <before.json> \\
    --after <after.json> \\
    --matrix <matrix.json>

Purpose:
  Normalize PerfReport meta to maximize comparability across base/head runs:
  - Pin meta.matrixId/matrixHash/matrixUpdatedAt to a chosen matrix.json
  - Ensure env.browser.version is present (copy from the other report if missing)
`

const parseArgs = (argv) => {
  const out = { before: undefined, after: undefined, matrix: undefined }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    const v = argv[i + 1]
    if (k === '--before') out.before = v
    if (k === '--after') out.after = v
    if (k === '--matrix') out.matrix = v
  }
  if (!out.before || !out.after || !out.matrix) {
    // eslint-disable-next-line no-console
    console.error(usage())
    process.exitCode = 2
    return null
  }
  return out
}

const sha256Text = (text) => crypto.createHash('sha256').update(text).digest('hex')

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const writeJson = (file, json) => fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, 'utf8')

const ensureObject = (x) => (x && typeof x === 'object' ? x : {})

const normalizeReport = (report, pinned) => {
  const meta = ensureObject(report.meta)
  const env = ensureObject(meta.env)
  const browser = ensureObject(env.browser)

  const nextBrowser = {
    ...browser,
    ...(pinned.browserVersion ? { version: pinned.browserVersion } : {}),
  }

  return {
    ...report,
    meta: {
      ...meta,
      matrixId: pinned.matrixId ?? meta.matrixId,
      matrixHash: pinned.matrixHash ?? meta.matrixHash,
      matrixUpdatedAt: pinned.matrixUpdatedAt ?? meta.matrixUpdatedAt,
      env: {
        ...env,
        browser: nextBrowser,
      },
    },
  }
}

const main = () => {
  const args = parseArgs(process.argv.slice(2))
  if (!args) return

  const before = readJson(args.before)
  const after = readJson(args.after)

  const matrixText = fs.readFileSync(args.matrix, 'utf8')
  const matrixJson = JSON.parse(matrixText)

  const matrixId = typeof matrixJson.id === 'string' && matrixJson.id.length > 0 ? matrixJson.id : undefined
  const matrixUpdatedAt =
    typeof matrixJson.updatedAt === 'string' && matrixJson.updatedAt.length > 0 ? matrixJson.updatedAt : undefined
  const matrixHash = sha256Text(matrixText)

  const beforeBrowserVersion = before?.meta?.env?.browser?.version
  const afterBrowserVersion = after?.meta?.env?.browser?.version
  const browserVersion =
    typeof afterBrowserVersion === 'string' && afterBrowserVersion.length > 0
      ? afterBrowserVersion
      : typeof beforeBrowserVersion === 'string' && beforeBrowserVersion.length > 0
        ? beforeBrowserVersion
        : undefined

  const pinned = { matrixId, matrixUpdatedAt, matrixHash, browserVersion }

  const nextBefore = normalizeReport(before, pinned)
  const nextAfter = normalizeReport(after, pinned)

  writeJson(args.before, nextBefore)
  writeJson(args.after, nextAfter)

  // eslint-disable-next-line no-console
  console.log(
    `[logix-perf] normalized reports: matrixId=${String(matrixId)} matrixHash=${matrixHash.slice(
      0,
      8,
    )} browser.version=${String(browserVersion ?? 'missing')}`,
  )
}

main()
