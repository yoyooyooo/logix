#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const CHANNELS = new Set(['stable', 'alpha', 'beta', 'rc', 'canary'])
const BUMPS = new Set(['major', 'minor', 'patch'])
const DEFAULT_CHANNEL = 'stable'
const DEFAULT_BUMP = 'patch'
const DEFAULT_REMOTE = 'origin'
const DEFAULT_BASE_REF = 'origin/main'
const DEFAULT_MAIN_BRANCH = 'main'

function git(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function parseArgs(argv) {
  const options = {
    channel: DEFAULT_CHANNEL,
    bump: DEFAULT_BUMP,
    base: null,
    version: null,
    dryRun: false,
    push: false,
    remote: DEFAULT_REMOTE,
    baseRef: DEFAULT_BASE_REF,
    allowDirty: false,
    allowHead: false,
    autoReleaseBranch: true,
    mainBranch: DEFAULT_MAIN_BRANCH,
  }

  const positional = []
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--push') {
      options.push = true
    } else if (arg === '--allow-dirty') {
      options.allowDirty = true
    } else if (arg === '--allow-head') {
      options.allowHead = true
    } else if (arg === '--no-release-branch') {
      options.autoReleaseBranch = false
    } else if (arg === '--channel') {
      options.channel = requireValue(argv, (i += 1), arg)
    } else if (arg.startsWith('--channel=')) {
      options.channel = arg.slice('--channel='.length)
    } else if (arg === '--bump') {
      options.bump = requireValue(argv, (i += 1), arg)
    } else if (arg.startsWith('--bump=')) {
      options.bump = arg.slice('--bump='.length)
    } else if (arg === '--base') {
      options.base = requireValue(argv, (i += 1), arg)
    } else if (arg.startsWith('--base=')) {
      options.base = arg.slice('--base='.length)
    } else if (arg === '--version') {
      options.version = requireValue(argv, (i += 1), arg)
    } else if (arg.startsWith('--version=')) {
      options.version = arg.slice('--version='.length)
    } else if (arg === '--remote') {
      options.remote = requireValue(argv, (i += 1), arg)
    } else if (arg.startsWith('--remote=')) {
      options.remote = arg.slice('--remote='.length)
    } else if (arg === '--base-ref') {
      options.baseRef = requireValue(argv, (i += 1), arg)
    } else if (arg.startsWith('--base-ref=')) {
      options.baseRef = arg.slice('--base-ref='.length)
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    } else {
      positional.push(arg)
    }
  }

  for (const value of positional) {
    if (CHANNELS.has(value)) options.channel = value
    else if (BUMPS.has(value)) options.bump = value
    else if (SEMVER_RE.test(value)) options.version = value
    else throw new Error(`Unknown positional argument: ${value}`)
  }

  if (!CHANNELS.has(options.channel)) {
    throw new Error(`Invalid channel "${options.channel}". Expected stable, alpha, beta, rc, or canary.`)
  }
  if (!BUMPS.has(options.bump)) {
    throw new Error(`Invalid bump "${options.bump}". Expected major, minor, or patch.`)
  }
  return options
}

function requireValue(argv, index, flag) {
  const value = argv[index]
  if (!value || value.startsWith('-')) throw new Error(`${flag} requires a value.`)
  return value
}

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z][0-9A-Za-z.-]*))?$/

function parseSemver(version) {
  const match = SEMVER_RE.exec(version)
  if (!match) throw new Error(`Invalid semver: ${version}`)
  return {
    raw: version,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  }
}

function compareSemver(a, b) {
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] - b[key]
  }
  if (a.prerelease === b.prerelease) return 0
  if (a.prerelease === null) return 1
  if (b.prerelease === null) return -1
  return a.prerelease.localeCompare(b.prerelease, 'en', { numeric: true })
}

function bumpVersion(version, bump) {
  const parsed = parseSemver(version)
  if (bump === 'major') return `${parsed.major + 1}.0.0`
  if (bump === 'minor') return `${parsed.major}.${parsed.minor + 1}.0`
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`
}

function stableCore(version) {
  const parsed = parseSemver(version)
  return `${parsed.major}.${parsed.minor}.${parsed.patch}`
}

function readCurrentPackageVersion() {
  const raw = readFileSync(join(process.cwd(), 'packages/logix-core/package.json'), 'utf8')
  return JSON.parse(raw).version
}

function listReleaseTags() {
  const output = git(['tag', '--list', 'logix-v*'])
  if (!output) return []
  return output
    .split('\n')
    .map((tag) => {
      const version = tag.slice('logix-v'.length)
      try {
        return { tag, version, parsed: parseSemver(version) }
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

function latestStable(tags) {
  const stable = tags.filter((entry) => entry.parsed.prerelease === null)
  stable.sort((a, b) => compareSemver(a.parsed, b.parsed))
  return stable.at(-1) ?? null
}

function resolveVersion(options, tags) {
  if (options.version) {
    const parsed = parseSemver(options.version)
    if (options.channel === 'stable' && parsed.prerelease !== null) {
      throw new Error('Stable releases must not use a prerelease suffix.')
    }
    return parsed.raw
  }

  const current = readCurrentPackageVersion()
  const currentParsed = parseSemver(current)
  const latest = latestStable(tags)
  const baseCore = options.base
    ? stableCore(options.base)
    : latest
      ? latest.version
      : stableCore(current)

  const base =
    !options.base && !latest && currentParsed.prerelease && options.bump === 'patch'
      ? baseCore
      : bumpVersion(baseCore, options.bump)

  if (options.channel === 'stable') return base
  if (options.channel === 'canary') {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '')
    const shortSha = git(['rev-parse', '--short=8', 'HEAD'])
    return `${base}-canary.${date}.${shortSha}`
  }

  const prefix = `${base}-${options.channel}.`
  const nextNumber =
    Math.max(
      0,
      ...tags
        .map((entry) => entry.version)
        .filter((version) => version.startsWith(prefix))
        .map((version) => Number(version.slice(prefix.length)))
        .filter(Number.isInteger),
    ) + 1
  return `${prefix}${nextNumber}`
}

function tagExists(tag) {
  const result = spawnSync('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`], {
    stdio: 'ignore',
  })
  return result.status === 0
}

function branchExists(branch) {
  const result = spawnSync('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], {
    stdio: 'ignore',
  })
  return result.status === 0
}

function refExists(ref) {
  const result = spawnSync('git', ['rev-parse', '--verify', '--quiet', ref], {
    stdio: 'ignore',
  })
  return result.status === 0
}

function currentBranch() {
  return git(['rev-parse', '--abbrev-ref', 'HEAD'])
}

function currentHead() {
  return git(['rev-parse', 'HEAD'])
}

function branchHead(branch) {
  return git(['rev-parse', branch])
}

function releaseBranchName(tag) {
  return `release/${tag}`
}

function resolveReleaseBranchPlan(options, context, tag) {
  const releaseBranch = releaseBranchName(tag)
  const base = {
    currentBranch: context.currentBranch,
    releaseBranch,
    action: 'none',
  }

  if (!options.autoReleaseBranch) return base
  if (context.currentBranch !== options.mainBranch) return base
  if (!context.clean) return base

  if (context.releaseBranchExists) {
    if (context.releaseBranchHead !== context.head) {
      throw new Error(
        `Release branch ${releaseBranch} already exists at a different commit. Delete it or switch intentionally.`,
      )
    }
    return {
      ...base,
      action: options.dryRun ? 'would-switch-existing' : 'switch-existing',
    }
  }

  return {
    ...base,
    action: options.dryRun ? 'would-create' : 'create',
  }
}

function planReleaseBranch(options, tag) {
  const releaseBranch = releaseBranchName(tag)
  const exists = branchExists(releaseBranch)
  return resolveReleaseBranchPlan(
    options,
    {
      currentBranch: currentBranch(),
      clean: git(['status', '--porcelain']) === '',
      head: currentHead(),
      releaseBranchExists: exists,
      releaseBranchHead: exists ? branchHead(releaseBranch) : null,
    },
    tag,
  )
}

function applyReleaseBranchPlan(plan) {
  if (plan.action === 'create') {
    execFileSync('git', ['switch', '-c', plan.releaseBranch], { stdio: 'inherit' })
  } else if (plan.action === 'switch-existing') {
    execFileSync('git', ['switch', plan.releaseBranch], { stdio: 'inherit' })
  }
}

function validateWorkspace(options) {
  if (!options.allowDirty) {
    const status = git(['status', '--porcelain'])
    if (status) throw new Error('Working tree is not clean. Commit or discard local changes, or pass --allow-dirty.')
  }

  if (!options.allowHead && refExists(options.baseRef)) {
    const result = spawnSync('git', ['merge-base', '--is-ancestor', options.baseRef, 'HEAD'], {
      stdio: 'ignore',
    })
    if (result.status !== 0) {
      throw new Error(`HEAD is not descended from ${options.baseRef}. Rebase or pass --allow-head intentionally.`)
    }
  }
}

function previousMergedTag(currentTag) {
  const unified = git(['tag', '--merged', 'HEAD', '--list', 'logix-v*'])
  const historicalCore = git(['tag', '--list', '@logixjs/core@*'])
  const tags = [unified, historicalCore]
    .filter(Boolean)
    .flatMap((output) => output.split('\n'))
    .filter(Boolean)
  return previousReleaseAnchorTag(tags, currentTag, currentTag.slice('logix-v'.length))
}

function previousReleaseAnchorTag(tags, currentTag, currentVersion) {
  const current = parseSemver(currentVersion)
  const entries = tags
    .filter((tag) => tag && tag !== currentTag)
    .map((tag) => {
      try {
        return releaseAnchorEntry(tag)
      } catch {
        return null
      }
    })
    .filter((entry) => entry && compareSemver(entry.parsed, current) < 0)

  const unified = entries.filter((entry) => entry.kind === 'unified')
  if (unified.length > 0) return latestAnchor(unified)?.tag ?? null

  const historical = entries.filter((entry) => {
    if (entry.kind !== 'historical-core') return false
    return current.prerelease === null ? entry.parsed.prerelease === null : true
  })
  return latestAnchor(historical)?.tag ?? null
}

function releaseAnchorEntry(tag) {
  if (tag.startsWith('logix-v')) {
    return {
      kind: 'unified',
      tag,
      parsed: parseSemver(tag.slice('logix-v'.length)),
    }
  }
  if (tag.startsWith('@logixjs/core@')) {
    return {
      kind: 'historical-core',
      tag,
      parsed: parseSemver(tag.slice('@logixjs/core@'.length)),
    }
  }
  throw new Error(`Unsupported release anchor tag: ${tag}`)
}

function latestAnchor(entries) {
  entries.sort((a, b) => compareSemver(a.parsed, b.parsed))
  return entries.at(-1) ?? null
}

function releaseNotes(version, tag) {
  const previous = previousMergedTag(tag)
  const range = previous ? `${previous}..HEAD` : 'HEAD'
  const logArgs = previous
    ? ['log', '--pretty=format:- %s (%h)', range]
    : ['log', '--max-count=100', '--pretty=format:- %s (%h)', range]
  const commits = git(logArgs)
  const lines = [`Release ${version}`, '', 'Release notes are generated from commits.', '']
  if (previous) lines.push(`Previous tag: ${previous}`, '')
  lines.push('## Commits', '', commits || '- No commits found.')
  return `${lines.join('\n')}\n`
}

function printHelp() {
  console.log(`Usage:
  pnpm release:tag
  pnpm release:tag [major|minor|patch] [stable|alpha|beta|rc|canary]
  pnpm release:tag --channel beta --bump minor
  pnpm release:tag --version 1.2.3 --push

Defaults:
  channel: stable
  bump: patch
  no args -> next stable patch release

Safety:
  --dry-run       print the planned tag and notes only
  --push          push the new tag to origin after creating it
  --allow-head    allow tagging a HEAD that is not origin/main
  --allow-dirty   allow local uncommitted changes
  --no-release-branch
                  do not auto-switch from clean main to release/logix-v*
`)
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  validateWorkspace(options)

  const tags = listReleaseTags()
  const version = resolveVersion(options, tags)
  const tag = `logix-v${version}`
  if (tagExists(tag)) throw new Error(`Tag already exists: ${tag}`)
  const releaseBranchPlan = planReleaseBranch(options, tag)

  const message = releaseNotes(version, tag)
  console.log(`release.version=${version}`)
  console.log(`release.channel=${options.channel}`)
  console.log(`release.tag=${tag}`)
  console.log(`release.branch=${releaseBranchPlan.releaseBranch}`)
  console.log(`release.branchAction=${releaseBranchPlan.action}`)
  console.log(`release.push=${options.push ? 'yes' : 'no'}`)
  console.log('')
  console.log(message)

  if (options.dryRun) return

  applyReleaseBranchPlan(releaseBranchPlan)
  execFileSync('git', ['tag', '-a', tag, '-m', message], { stdio: 'inherit' })
  if (options.push) {
    execFileSync('git', ['push', options.remote, tag], { stdio: 'inherit' })
  } else {
    console.log(`Created ${tag}. Push with: git push ${options.remote} ${tag}`)
  }
}

export {
  bumpVersion,
  compareSemver,
  latestStable,
  parseSemver,
  previousReleaseAnchorTag,
  previousMergedTag,
  releaseNotes,
  releaseBranchName,
  resolveReleaseBranchPlan,
  resolveVersion,
  validateWorkspace,
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
