import fs from 'node:fs/promises'
import path from 'node:path'

import { Effect, Layer } from 'effect'

import {
  PathEscapeError,
  UnsafePathSegmentError,
  assertSafePathSegment,
  findRepoPaths,
  resolveWithinRoot,
  type RepoPaths,
} from '../util/repo-paths.js'
import { parseTasksMarkdown, updateCheckboxLine } from './specboard.tasks.js'
import { Specboard, type ArtifactName, type SpecboardError, type SpecboardService } from './specboard.service.js'

function toInternalError(message: string): SpecboardError {
  return { _tag: 'InternalError', message }
}

function toFsError(e: unknown): SpecboardError {
  if (e instanceof UnsafePathSegmentError || e instanceof PathEscapeError) {
    return { _tag: 'ForbiddenError', message: 'Forbidden path' }
  }
  if (typeof e === 'object' && e !== null && 'code' in e) {
    const code = (e as { readonly code?: unknown }).code
    if (code === 'ENOENT') return { _tag: 'NotFoundError', message: 'File not found' }
    if (code === 'EACCES' || code === 'EPERM') return { _tag: 'ForbiddenError', message: 'Permission denied' }
  }
  return toInternalError(e instanceof Error ? e.message : 'Internal error')
}

function inferTitleFromMarkdown(markdown: string, fallback: string): string {
  const line = markdown.split(/\r?\n/).find((l) => l.startsWith('# '))
  return line ? line.replace(/^#\s+/, '').trim() : fallback
}

function parseSpecDirName(dirName: string): { readonly id: string; readonly num: number } | null {
  if (!/^\d{3}-/.test(dirName)) return null
  const num = Number.parseInt(dirName.slice(0, 3), 10)
  if (Number.isNaN(num)) return null
  return { id: dirName, num }
}

function specFileRelPath(specId: string, name: ArtifactName): string {
  return path.posix.join('specs', specId, name)
}

function absSpecDir(paths: RepoPaths, specId: string): string {
  assertSafePathSegment(specId)
  return resolveWithinRoot(paths.specsRoot, specId)
}

function absSpecFile(paths: RepoPaths, specId: string, name: ArtifactName): string {
  return resolveWithinRoot(absSpecDir(paths, specId), name)
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.stat(p)
    return true
  } catch {
    return false
  }
}

async function writeFileAtomic(absPath: string, content: string): Promise<void> {
  const dir = path.dirname(absPath)
  const tmpPath = path.join(dir, `.tmp.${path.basename(absPath)}.${Date.now()}.${Math.random().toString(16).slice(2)}`)
  await fs.writeFile(tmpPath, content, 'utf8')
  await fs.rename(tmpPath, absPath)
}

export const SpecboardServiceLive: Layer.Layer<Specboard> = Layer.effect(
  Specboard,
  Effect.sync(() => {
    const pathsOrError: RepoPaths | SpecboardError = (() => {
      try {
        return findRepoPaths()
      } catch (e) {
        return toInternalError(e instanceof Error ? e.message : 'Cannot find repo root')
      }
    })()

    const isError = (u: RepoPaths | SpecboardError): u is SpecboardError =>
      typeof u === 'object' && u !== null && '_tag' in u

    const withPaths = <A>(
      f: (paths: RepoPaths) => Effect.Effect<A, SpecboardError>,
    ): Effect.Effect<A, SpecboardError> => (isError(pathsOrError) ? Effect.fail(pathsOrError) : f(pathsOrError))

    const listSpecs: SpecboardService['listSpecs'] = withPaths((paths) =>
      Effect.tryPromise({
        try: async () => {
          const dirents = await fs.readdir(paths.specsRoot, { withFileTypes: true })

          const specs = dirents
            .filter((d) => d.isDirectory())
            .map((d) => parseSpecDirName(d.name))
            .filter((v): v is { readonly id: string; readonly num: number } => v !== null)

          const items = await Promise.all(
            specs.map(async ({ id, num }) => {
              const specMdPath = absSpecFile(paths, id, 'spec.md')
              const specMd = (await exists(specMdPath)) ? await fs.readFile(specMdPath, 'utf8') : null

              const tasksMdPath = absSpecFile(paths, id, 'tasks.md')
              const tasksMd = (await exists(tasksMdPath)) ? await fs.readFile(tasksMdPath, 'utf8') : null
              const tasks = tasksMd ? parseTasksMarkdown(tasksMd) : []

              const done = tasks.filter((t) => t.checked).length
              const total = tasks.length

              return {
                id,
                num,
                title: specMd ? inferTitleFromMarkdown(specMd, id) : id,
                taskStats: tasksMd
                  ? {
                      total,
                      done,
                      todo: total - done,
                    }
                  : undefined,
              }
            }),
          )

          items.sort((a, b) => b.num - a.num || b.id.localeCompare(a.id))
          return { items }
        },
        catch: toFsError,
      }),
    )

    const listTasks: SpecboardService['listTasks'] = (specId) =>
      withPaths((paths) =>
        Effect.tryPromise({
          try: async () => {
            const tasksMdPath = absSpecFile(paths, specId, 'tasks.md')
            const tasksMd = await fs.readFile(tasksMdPath, 'utf8')
            const tasks = parseTasksMarkdown(tasksMd)
            return { specId, tasks }
          },
          catch: toFsError,
        }),
      )

    const toggleTask: SpecboardService['toggleTask'] = ({ specId, line, checked }) =>
      withPaths((paths) =>
        Effect.tryPromise({
          try: async () => {
            if (!Number.isInteger(line) || line <= 0) {
              return Promise.reject({ _tag: 'ValidationError', message: 'invalid line' } satisfies SpecboardError)
            }

            const tasksMdPath = absSpecFile(paths, specId, 'tasks.md')
            const tasksMd = await fs.readFile(tasksMdPath, 'utf8')
            const lines = tasksMd.split(/\r?\n/)

            const idx = line - 1
            if (idx < 0 || idx >= lines.length) {
              return Promise.reject({ _tag: 'ValidationError', message: 'line out of range' } satisfies SpecboardError)
            }

            const updated = updateCheckboxLine(lines[idx] ?? '', checked)
            if (!updated) {
              return Promise.reject({
                _tag: 'ValidationError',
                message: 'target line is not a checkbox task',
              } satisfies SpecboardError)
            }

            lines[idx] = updated
            await writeFileAtomic(tasksMdPath, lines.join('\n'))

            const nextTasksMd = await fs.readFile(tasksMdPath, 'utf8')
            return { specId, tasks: parseTasksMarkdown(nextTasksMd) }
          },
          catch: (e) => {
            if (typeof e === 'object' && e !== null && '_tag' in e) {
              const tag = (e as { readonly _tag?: unknown })._tag
              if (tag === 'ValidationError') {
                return e as SpecboardError
              }
            }
            return toFsError(e)
          },
        }),
      )

    const readFile: SpecboardService['readFile'] = ({ specId, name }) =>
      withPaths((paths) =>
        Effect.tryPromise({
          try: async () => {
            const absPath = absSpecFile(paths, specId, name)
            const content = await fs.readFile(absPath, 'utf8')
            return { name, path: specFileRelPath(specId, name), content }
          },
          catch: toFsError,
        }),
      )

    const writeFile: SpecboardService['writeFile'] = ({ specId, name, content }) =>
      withPaths((paths) =>
        Effect.tryPromise({
          try: async () => {
            const specDir = absSpecDir(paths, specId)
            if (!(await exists(specDir))) {
              return Promise.reject({ _tag: 'NotFoundError', message: 'Spec not found' } satisfies SpecboardError)
            }

            const absPath = absSpecFile(paths, specId, name)
            await writeFileAtomic(absPath, content)
            return { name, path: specFileRelPath(specId, name) }
          },
          catch: (e) => {
            if (typeof e === 'object' && e !== null && '_tag' in e) {
              const tag = (e as { readonly _tag?: unknown })._tag
              if (tag === 'NotFoundError') {
                return e as SpecboardError
              }
            }
            return toFsError(e)
          },
        }),
      )

    return { listSpecs, listTasks, toggleTask, readFile, writeFile } satisfies SpecboardService
  }),
)
