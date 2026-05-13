#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const TAG_RE = /^logix-v(\d+\.\d+\.\d+(?:-[0-9A-Za-z][0-9A-Za-z.-]*)?)$/
const PUBLIC_SCOPE = '@logixjs/'
const IGNORED_PUBLIC_PACKAGES = new Set(['@logixjs/perf-evidence', '@logixjs/playground'])

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function parseArgs(argv) {
  const options = {
    version: null,
    tagName: process.env.GITHUB_REF_NAME ?? null,
    dryRun: false,
    otp: null,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--version') {
      options.version = requireValue(argv, (i += 1), arg)
    } else if (arg.startsWith('--version=')) {
      options.version = arg.slice('--version='.length)
    } else if (arg === '--tag-name') {
      options.tagName = requireValue(argv, (i += 1), arg)
    } else if (arg.startsWith('--tag-name=')) {
      options.tagName = arg.slice('--tag-name='.length)
    } else if (arg === '--otp') {
      options.otp = requireValue(argv, (i += 1), arg)
    } else if (arg.startsWith('--otp=')) {
      options.otp = arg.slice('--otp='.length)
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown option: ${arg}`)
    }
  }
  return options
}

function requireValue(argv, index, flag) {
  const value = argv[index]
  if (!value || value.startsWith('-')) throw new Error(`${flag} requires a value.`)
  return value
}

function resolveVersion(options) {
  if (options.version) return options.version
  const tagName = options.tagName
  const match = tagName ? TAG_RE.exec(tagName) : null
  if (!match) {
    throw new Error(`Release publish requires a logix-v* tag. Received: ${tagName ?? '<unset>'}`)
  }
  return match[1]
}

function distTagForVersion(version) {
  if (/^\d+\.\d+\.\d+$/.test(version)) return 'latest'
  const prerelease = version.split('-')[1] ?? ''
  const channel = prerelease.split('.')[0]
  if (['alpha', 'beta', 'rc', 'canary'].includes(channel)) return channel
  throw new Error(`Unsupported prerelease channel in version: ${version}`)
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function buildPublishedManifest(pkg, version) {
  const manifest = JSON.parse(JSON.stringify(pkg))
  manifest.version = version

  const publishConfig = manifest.publishConfig
  if (publishConfig && typeof publishConfig === 'object') {
    for (const key of ['bin', 'exports', 'main', 'module', 'types']) {
      if (publishConfig[key] !== undefined) {
        manifest[key] = publishConfig[key]
      }
    }
  }

  return manifest
}

function packageDirs() {
  return readdirSync('packages', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join('packages', entry.name))
    .filter((dir) => existsSync(join(dir, 'package.json')))
}

function publicPackages() {
  return packageDirs()
    .map((dir) => ({ dir, pkg: readJson(join(dir, 'package.json')) }))
    .filter(({ pkg }) => {
      return (
        typeof pkg.name === 'string' &&
        pkg.name.startsWith(PUBLIC_SCOPE) &&
        pkg.private !== true &&
        !IGNORED_PUBLIC_PACKAGES.has(pkg.name)
      )
    })
    .sort((a, b) => a.pkg.name.localeCompare(b.pkg.name))
}

function stagePackageVersions(version, packages) {
  const names = new Set(packages.map(({ pkg }) => pkg.name))
  const backups = []

  for (const { dir, pkg } of packages) {
    const path = join(dir, 'package.json')
    const backup = `${path}.release-backup`
    copyFileSync(path, backup)
    backups.push({ path, backup })

    const publishedManifest = buildPublishedManifest(pkg, version)
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      const deps = publishedManifest[section]
      if (!deps || typeof deps !== 'object') continue
      for (const name of names) {
        if (deps[name]?.startsWith?.('workspace:')) deps[name] = version
      }
    }
    writeJson(path, publishedManifest)
  }

  return () => {
    for (const { path, backup } of backups.reverse()) {
      renameSync(backup, path)
    }
  }
}

function run(command, args, options = {}) {
  console.log(`+ ${[command, ...args].join(' ')}`)
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function npmPackArgs(outDir) {
  return ['pack', '--ignore-scripts', '--pack-destination', outDir]
}

function packPackages(packages) {
  const outDir = mkdtempSync(join(tmpdir(), 'logix-release-pack-'))
  for (const { dir, pkg } of packages) {
    console.log(`Packing ${pkg.name}`)
    run('npm', npmPackArgs(outDir), { cwd: dir })
  }
  return outDir
}

function publishTarballs(packDir, distTag, otp) {
  const tarballs = readdirSync(packDir)
    .filter((name) => name.endsWith('.tgz'))
    .sort()
    .map((name) => join(packDir, name))
  if (tarballs.length === 0) throw new Error('No tarballs were produced.')

  for (const tarball of tarballs) {
    const args = ['publish', tarball, '--access', 'public', '--tag', distTag]
    if (otp) args.push('--otp', otp)
    console.log(`+ npm ${args.join(' ')}`)
    const result = spawnSync('npm', args, {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    })
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
    if (output) process.stdout.write(output)
    if (result.status === 0) continue
    if (/previously published|cannot publish over|version already exists/i.test(output)) {
      console.log(`Skipping already-published tarball: ${tarball}`)
      continue
    }
    process.exit(result.status ?? 1)
  }
}

function releaseNotesFromTag(tagName) {
  if (!tagName) return ''
  const result = spawnSync('git', ['tag', '-l', tagName, '--format=%(contents)'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  return result.stdout?.trim() ?? ''
}

function createGithubRelease(tagName, version, distTag, packDir, notes) {
  if (!tagName || !process.env.GITHUB_ACTIONS) return
  const bodyFile = join(packDir, 'release-notes.md')
  writeFileSync(
    bodyFile,
    `${notes || `Release ${version}`}\n\nnpm dist-tag: \`${distTag}\`\n`,
  )
  const files = readdirSync(packDir)
    .filter((name) => name.endsWith('.tgz'))
    .map((name) => join(packDir, name))
  const view = spawnSync('gh', ['release', 'view', tagName], { stdio: 'ignore' })
  if (view.status === 0) {
    run('gh', ['release', 'edit', tagName, '--title', version, '--notes-file', bodyFile])
    run('gh', ['release', 'upload', tagName, ...files, '--clobber'])
    return
  }
  run('gh', [
    'release',
    'create',
    tagName,
    ...files,
    '--title',
    version,
    '--notes-file',
    bodyFile,
    ...(version.includes('-') ? ['--prerelease'] : []),
  ])
}

function printHelp() {
  console.log(`Usage:
  pnpm release:publish
  pnpm release:publish --dry-run
  pnpm release:publish --version 1.2.3 --tag-name logix-v1.2.3

The version normally comes from GITHUB_REF_NAME=logix-v* in CI.
`)
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const version = resolveVersion(options)
  const distTag = distTagForVersion(version)
  const packages = publicPackages()

  console.log(`release.version=${version}`)
  console.log(`release.npmTag=${distTag}`)
  console.log(`release.packages=${packages.map(({ pkg }) => pkg.name).join(',')}`)

  if (distTag !== 'latest') {
    console.warn(`Publishing prerelease channel with npm dist-tag "${distTag}".`)
  }
  if (distTag === 'latest') {
    console.warn('Publishing stable channel with npm dist-tag "latest".')
  }

  const restore = stagePackageVersions(version, packages)
  let packDir = null
  try {
    if (options.dryRun) {
      console.log('Dry run: staged package versions only; publish skipped.')
      return
    }
    packDir = packPackages(packages)
    publishTarballs(packDir, distTag, options.otp)
    createGithubRelease(options.tagName, version, distTag, packDir, releaseNotesFromTag(options.tagName))
  } finally {
    restore()
    if (packDir) rmSync(packDir, { recursive: true, force: true })
  }
}

export {
  buildPublishedManifest,
  distTagForVersion,
  npmPackArgs,
  publicPackages,
  stagePackageVersions,
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]

if (isMain) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
