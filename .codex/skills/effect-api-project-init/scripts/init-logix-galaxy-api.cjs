#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('node:fs/promises')
const path = require('node:path')

const IGNORED_NAMES = new Set(['node_modules', 'dist', '.turbo', '.DS_Store'])

function parseArgs(argv) {
  const args = {
    templateDir: 'examples/effect-api',
    targetDir: 'apps/logix-galaxy-api',
    packageName: 'logix-galaxy-api',
    dryRun: false,
  }

  const positional = []
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token === '--template' || token === '--templateDir') {
      args.templateDir = argv[++i]
      continue
    }
    if (token === '--target' || token === '--targetDir') {
      args.targetDir = argv[++i]
      continue
    }
    if (token === '--packageName' || token === '--name') {
      args.packageName = argv[++i]
      continue
    }
    if (token === '--dry-run' || token === '--dryRun') {
      args.dryRun = true
      continue
    }
    positional.push(token)
  }

  if (positional[0]) args.targetDir = positional[0]
  if (positional[1]) args.packageName = positional[1]
  if (positional[2]) args.templateDir = positional[2]
  return args
}

function usage() {
  return [
    'Usage:',
    '  node .codex/skills/effect-api-project-init/scripts/init-logix-galaxy-api.cjs [targetDir] [packageName] [templateDir]',
    '',
    'Options:',
    '  --target <dir>       Default: apps/logix-galaxy-api',
    '  --packageName <name> Default: logix-galaxy-api',
    '  --template <dir>     Default: examples/effect-api',
    '  --dry-run            Print actions without writing',
    '',
    'Example:',
    '  node .codex/skills/effect-api-project-init/scripts/init-logix-galaxy-api.cjs apps/logix-galaxy-api logix-galaxy-api examples/effect-api',
  ].join('\n')
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function assertEmptyDirOrMissing(dirPath) {
  if (!(await pathExists(dirPath))) return
  const stat = await fs.stat(dirPath)
  if (!stat.isDirectory()) {
    throw new Error(`Target exists but is not a directory: ${dirPath}`)
  }
  const entries = await fs.readdir(dirPath)
  if (entries.length > 0) {
    throw new Error(`Target directory is not empty: ${dirPath}`)
  }
}

async function copyDirRecursively(srcDir, destDir, dryRun) {
  const entries = await fs.readdir(srcDir, { withFileTypes: true })
  for (const entry of entries) {
    if (IGNORED_NAMES.has(entry.name)) continue

    const srcPath = path.join(srcDir, entry.name)
    const destPath = path.join(destDir, entry.name)

    if (entry.isDirectory()) {
      if (!dryRun) await fs.mkdir(destPath, { recursive: true })
      await copyDirRecursively(srcPath, destPath, dryRun)
      continue
    }

    if (entry.isFile()) {
      if (dryRun) continue
      await fs.copyFile(srcPath, destPath)
      continue
    }
  }
}

async function patchPackageJson(packageJsonPath, packageName, dryRun) {
  const raw = await fs.readFile(packageJsonPath, 'utf8')
  const json = JSON.parse(raw)
  json.name = packageName
  const next = `${JSON.stringify(json, null, 2)}\n`
  if (!dryRun) await fs.writeFile(packageJsonPath, next, 'utf8')
}

async function patchReadme(readmePath, packageName, targetDirRaw, templateDirRaw, dryRun) {
  if (!(await pathExists(readmePath))) return
  const raw = await fs.readFile(readmePath, 'utf8')
  const patched = raw
    .replace(/^#\s*@examples\/effect-api\s*$/m, `# ${packageName}`)
    .replaceAll(templateDirRaw, targetDirRaw)
  if (!dryRun) await fs.writeFile(readmePath, patched, 'utf8')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.targetDir || !args.templateDir || !args.packageName) {
    console.error(usage())
    process.exit(1)
  }

  const repoRoot = path.resolve(__dirname, '../../../..')
  const targetDirAbs = path.isAbsolute(args.targetDir) ? args.targetDir : path.join(repoRoot, args.targetDir)
  const templateDirAbs = path.isAbsolute(args.templateDir) ? args.templateDir : path.join(repoRoot, args.templateDir)

  const packageJsonSrc = path.join(templateDirAbs, 'package.json')
  if (!(await pathExists(packageJsonSrc))) {
    throw new Error(`Template missing package.json: ${packageJsonSrc}`)
  }

  await assertEmptyDirOrMissing(targetDirAbs)

  if (args.dryRun) {
    console.log('[DRY RUN] Will initialize backend app')
    console.log(`          Target: ${args.targetDir}`)
    console.log(`          Package name: ${args.packageName}`)
    console.log(`          Template: ${args.templateDir}`)
    return
  }

  if (!args.dryRun) await fs.mkdir(targetDirAbs, { recursive: true })
  await copyDirRecursively(templateDirAbs, targetDirAbs, args.dryRun)

  await patchPackageJson(path.join(targetDirAbs, 'package.json'), args.packageName, args.dryRun)
  await patchReadme(
    path.join(targetDirAbs, 'README.md'),
    args.packageName,
    args.targetDir,
    args.templateDir,
    args.dryRun,
  )

  if (!args.dryRun) {
    console.log(`[OK] Initialized: ${args.targetDir}`)
    console.log(`     Package name: ${args.packageName}`)
    console.log(`     Template: ${args.templateDir}`)
  }
}

main().catch((error) => {
  console.error(`[ERROR] ${error?.message ?? String(error)}`)
  process.exit(1)
})
