import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'

export type ProgramOperationKind = 'run' | 'check'

export interface ProgramWrapperInput {
  readonly snapshot: ProjectSnapshot
  readonly kind: ProgramOperationKind
}

const scriptExtensions = ['.ts', '.tsx', '.js', '.jsx'] as const

const localImportPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"]/g

const isScriptFile = (path: string): boolean => scriptExtensions.some((extension) => path.endsWith(extension))

const dirname = (path: string): string => {
  const index = path.lastIndexOf('/')
  return index <= 0 ? '/' : path.slice(0, index)
}

const normalizePath = (path: string): string => {
  const segments: Array<string> = []
  for (const segment of path.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      segments.pop()
      continue
    }
    segments.push(segment)
  }
  return `/${segments.join('/')}`
}

const resolveLocalImport = (fromPath: string, specifier: string, snapshot: ProjectSnapshot): string | undefined => {
  const base = normalizePath(`${dirname(fromPath)}/${specifier}`)
  const candidates = [
    base,
    ...scriptExtensions.map((extension) => `${base}${extension}`),
    ...scriptExtensions.map((extension) => `${base}/index${extension}`),
  ]
  return candidates.find((candidate) => snapshot.files.has(candidate))
}

const collectProgramFilePaths = (snapshot: ProjectSnapshot): ReadonlyArray<string> => {
  const entry = snapshot.programEntry?.entry
  if (!entry) return []

  const visited = new Set<string>()
  const ordered: Array<string> = []

  const visit = (path: string): void => {
    if (visited.has(path)) return
    const file = snapshot.files.get(path)
    if (!file || !isScriptFile(path)) return
    visited.add(path)

    for (const match of file.content.matchAll(localImportPattern)) {
      const resolved = resolveLocalImport(path, match[1]!, snapshot)
      if (resolved) visit(resolved)
    }

    ordered.push(path)
  }

  visit(entry)
  return ordered
}

const stripLocalImports = (source: string): string =>
  source
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed.startsWith('import') && !trimmed.startsWith('export')) return true
      return !/from\s+['"]\.{1,2}\//.test(trimmed) && !/^import\s+['"]\.{1,2}\//.test(trimmed)
    })
    .join('\n')

export const snapshotFilesToModuleSource = (snapshot: ProjectSnapshot): string => {
  const filePaths = collectProgramFilePaths(snapshot)
  if (filePaths.length === 0) return ''

  return filePaths
    .map((path) => {
      const file = snapshot.files.get(path)
      return `// snapshot-file:${path}\n${stripLocalImports(file?.content ?? '')}`
    })
    .join('\n\n')
}

export const createProgramWrapperSource = ({ snapshot, kind }: ProgramWrapperInput): string => {
  if (!snapshot.programEntry) {
    throw new Error(`Project ${snapshot.projectId} has no Program entry`)
  }

  const moduleSource = snapshotFilesToModuleSource(snapshot)
  const operation = kind === 'run'
    ? 'return yield* __LogixPlaygroundEffect.promise(() => __LogixPlaygroundLogix.Runtime.run(Program, main, options))'
    : 'return yield* __LogixPlaygroundLogix.Runtime.check(Program, options)'

  return [
    'import { Effect as __LogixPlaygroundEffect } from "effect"',
    'import * as __LogixPlaygroundLogix from "@logixjs/core"',
    '',
    moduleSource,
    '',
    'export default __LogixPlaygroundEffect.gen(function* () {',
    `  const options = { runId: ${JSON.stringify(`${snapshot.projectId}:${kind}:r${snapshot.revision}`)}, handleSignals: false, closeScopeTimeout: 1000 }`,
    `  ${operation}`,
    '})',
    '',
  ].join('\n')
}
