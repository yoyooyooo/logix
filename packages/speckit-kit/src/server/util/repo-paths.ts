import fs from 'node:fs'
import path from 'node:path'

export interface RepoPaths {
  readonly repoRoot: string
  readonly specsRoot: string
}

export class RepoRootNotFoundError extends Error {
  override readonly name = 'RepoRootNotFoundError'
}

export class UnsafePathSegmentError extends Error {
  override readonly name = 'UnsafePathSegmentError'
}

export class PathEscapeError extends Error {
  override readonly name = 'PathEscapeError'
}

export function findRepoPaths(startDir: string = process.cwd()): RepoPaths {
  const envRepoRoot = process.env.SPECKIT_KIT_REPO_ROOT ?? process.env.SPECKIT_REPO_ROOT
  if (envRepoRoot) {
    const repoRoot = path.resolve(envRepoRoot)
    const specsRoot = path.join(repoRoot, 'specs')
    if (!fs.existsSync(specsRoot) || !fs.statSync(specsRoot).isDirectory()) {
      throw new RepoRootNotFoundError(`Invalid repo root: specs/ not found under ${repoRoot}`)
    }
    return { repoRoot, specsRoot }
  }

  let dir = path.resolve(startDir)
  while (true) {
    const specsRoot = path.join(dir, 'specs')
    if (fs.existsSync(specsRoot) && fs.statSync(specsRoot).isDirectory()) {
      return { repoRoot: dir, specsRoot }
    }

    const parent = path.dirname(dir)
    if (parent === dir) {
      break
    }
    dir = parent
  }

  throw new RepoRootNotFoundError(`Cannot locate repo root starting from: ${startDir}`)
}

export function resolveWithinRoot(rootDir: string, relativePath: string): string {
  const rootAbs = path.resolve(rootDir)
  const targetAbs = path.resolve(rootAbs, relativePath)
  const rootPrefix = rootAbs.endsWith(path.sep) ? rootAbs : `${rootAbs}${path.sep}`

  if (!targetAbs.startsWith(rootPrefix)) {
    throw new PathEscapeError(`Path escapes root: ${relativePath}`)
  }

  return targetAbs
}

export function assertSafePathSegment(segment: string): void {
  if (segment.includes('/') || segment.includes('\\')) {
    throw new UnsafePathSegmentError('Path segment contains separator')
  }
}
