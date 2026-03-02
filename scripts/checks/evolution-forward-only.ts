import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

type Mode =
  | { readonly kind: 'worktree' }
  | { readonly kind: 'cached' }
  | { readonly kind: 'base'; readonly base: string }

type ChangedFile = {
  readonly status: string
  readonly path: string
  readonly oldPath?: string
}

type Surface = {
  readonly id: string
  readonly path: string
  readonly kind: 'protocol' | 'behavior'
  readonly breakingWhen: 'always-on-change'
}

type VersionCheck = {
  readonly id: string
  readonly path: string
  readonly pointer: string
}

type MigrationMap = {
  readonly schemaVersion: number
  readonly specId: string
  readonly gate: string
  readonly reasonCode: string
  readonly migrationNotesDir: string
  readonly requiredSections: ReadonlyArray<string>
  readonly requiredFrontMatterKeys: ReadonlyArray<string>
  readonly surfaces: ReadonlyArray<Surface>
  readonly versionChecks: ReadonlyArray<VersionCheck>
}

type BreakingSignal = {
  readonly surfaceId: string
  readonly kind: Surface['kind']
  readonly path: string
  readonly status: string
}

type Violation = {
  readonly code:
    | 'MIGRATION_MAP_NOT_FOUND'
    | 'MIGRATION_MAP_INVALID'
    | 'PROTOCOL_VERSION_NOT_BUMPED'
    | 'BREAKING_CHANGE_WITHOUT_MIGRATION_NOTE'
    | 'MIGRATION_NOTE_INVALID'
    | 'BREAKING_SURFACE_NOT_MAPPED_IN_NOTE'
  readonly message: string
  readonly details?: unknown
}

const MIGRATION_TEMPLATE_PATH = 'specs/103-cli-minimal-kernel-self-loop/migration-template.md'
const MAP_START = '<!-- logix:migration-map:start -->'
const MAP_END = '<!-- logix:migration-map:end -->'

const parseArgs = (argv: ReadonlyArray<string>): Mode => {
  let mode: Mode = { kind: 'worktree' }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--cached') {
      mode = { kind: 'cached' }
      continue
    }
    if (arg === '--base') {
      const base = argv[i + 1]
      if (!base) {
        throw new Error('Missing value for --base <ref>')
      }
      i += 1
      mode = { kind: 'base', base }
      continue
    }
    if (arg === '--help' || arg === '-h') {
      // eslint-disable-next-line no-console
      console.log(
        [
          'Usage: tsx scripts/checks/evolution-forward-only.ts [--cached] [--base <ref>]',
          '',
          'Forward-only migration gate for spec 103:',
          '- Detect protocol/behavior breaking surfaces from git diff',
          '- Enforce schema/manifest version bump on changed versioned contracts',
          '- Require migration notes for breaking changes',
          '- Output machine-readable JSON reason and exit non-zero on violation',
          '',
          'Modes:',
          '  (default)        git diff --name-status HEAD',
          '  --cached         git diff --cached --name-status',
          '  --base <ref>     git diff --name-status <ref>...HEAD',
        ].join('\n'),
      )
      process.exit(0)
    }
  }

  return mode
}

const shell = (cmd: string): string =>
  execSync(cmd, {
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024 * 64,
  }).toString('utf-8')

const diffRangeArgs = (mode: Mode): string => {
  if (mode.kind === 'cached') return '--cached'
  if (mode.kind === 'base') return `${mode.base}...HEAD`
  return 'HEAD'
}

const parseNameStatus = (raw: string): ReadonlyArray<ChangedFile> => {
  const files: ChangedFile[] = []
  for (const line of raw.split('\n')) {
    const row = line.trim()
    if (!row) continue

    const cols = row.split('\t')
    const status = cols[0] ?? ''
    if (!status) continue

    if (status.startsWith('R') || status.startsWith('C')) {
      const oldPath = cols[1]
      const newPath = cols[2]
      if (!oldPath || !newPath) continue
      files.push({ status, oldPath, path: newPath })
      continue
    }

    const filePath = cols[1]
    if (!filePath) continue
    files.push({ status, path: filePath })
  }

  return files
}

const getChangedFiles = (mode: Mode): ReadonlyArray<ChangedFile> => {
  const args = diffRangeArgs(mode)
  const cmd = mode.kind === 'cached' ? 'git diff --cached --name-status' : `git diff --name-status ${args}`
  return parseNameStatus(shell(cmd))
}

const getBaseRefForVersionRead = (mode: Mode): string => {
  if (mode.kind === 'base') return mode.base
  return 'HEAD'
}

const readGitBlob = (ref: string, filePath: string): string | undefined => {
  try {
    return shell(`git show ${ref}:${filePath}`)
  } catch {
    return undefined
  }
}

const pointerGet = (value: unknown, pointer: string): unknown => {
  if (!pointer.startsWith('/')) return undefined
  const segments = pointer
    .slice(1)
    .split('/')
    .map((item) => item.replace(/~1/g, '/').replace(/~0/g, '~'))

  let current: unknown = value
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

const readJsonPointer = (content: string, pointer: string): unknown => {
  const parsed = JSON.parse(content) as unknown
  return pointerGet(parsed, pointer)
}

const extractMapJson = (template: string): string => {
  const start = template.indexOf(MAP_START)
  const end = template.indexOf(MAP_END)
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('migration map markers are missing')
  }

  const block = template.slice(start + MAP_START.length, end)
  const match = block.match(/```json\s*([\s\S]*?)```/)
  if (!match?.[1]) {
    throw new Error('migration map json block is missing')
  }
  return match[1].trim()
}

const ensureStringArray = (value: unknown, name: string): ReadonlyArray<string> => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`invalid ${name}`)
  }
  return value as ReadonlyArray<string>
}

const loadMigrationMap = (): MigrationMap => {
  const raw = fs.readFileSync(MIGRATION_TEMPLATE_PATH, 'utf-8')
  const jsonText = extractMapJson(raw)
  const parsed = JSON.parse(jsonText) as Partial<MigrationMap>

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('migration map json must be object')
  }
  if (typeof parsed.schemaVersion !== 'number') {
    throw new Error('migration map schemaVersion must be number')
  }
  if (typeof parsed.specId !== 'string' || !parsed.specId) {
    throw new Error('migration map specId is required')
  }
  if (typeof parsed.gate !== 'string' || !parsed.gate) {
    throw new Error('migration map gate is required')
  }
  if (typeof parsed.reasonCode !== 'string' || !parsed.reasonCode) {
    throw new Error('migration map reasonCode is required')
  }
  if (typeof parsed.migrationNotesDir !== 'string' || !parsed.migrationNotesDir) {
    throw new Error('migration map migrationNotesDir is required')
  }

  const requiredSections = ensureStringArray(parsed.requiredSections, 'requiredSections')
  const requiredFrontMatterKeys = ensureStringArray(parsed.requiredFrontMatterKeys, 'requiredFrontMatterKeys')

  if (!Array.isArray(parsed.surfaces)) {
    throw new Error('migration map surfaces is required')
  }
  const surfaces = parsed.surfaces.map((surface, index) => {
    if (!surface || typeof surface !== 'object') {
      throw new Error(`migration map surface[${index}] invalid`)
    }
    const s = surface as Surface
    if (!s.id || !s.path || (s.kind !== 'protocol' && s.kind !== 'behavior')) {
      throw new Error(`migration map surface[${index}] invalid fields`)
    }
    if (s.breakingWhen !== 'always-on-change') {
      throw new Error(`migration map surface[${index}] invalid breakingWhen`) // forward-only strict mode
    }
    return s
  })

  if (!Array.isArray(parsed.versionChecks)) {
    throw new Error('migration map versionChecks is required')
  }
  const versionChecks = parsed.versionChecks.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`migration map versionChecks[${index}] invalid`)
    }
    const c = item as VersionCheck
    if (!c.id || !c.path || !c.pointer) {
      throw new Error(`migration map versionChecks[${index}] missing fields`)
    }
    return c
  })

  return {
    schemaVersion: parsed.schemaVersion,
    specId: parsed.specId,
    gate: parsed.gate,
    reasonCode: parsed.reasonCode,
    migrationNotesDir: parsed.migrationNotesDir,
    requiredSections,
    requiredFrontMatterKeys,
    surfaces,
    versionChecks,
  }
}

const detectBreakingSignals = (args: {
  readonly map: MigrationMap
  readonly changedFiles: ReadonlyArray<ChangedFile>
}): ReadonlyArray<BreakingSignal> => {
  const changesByPath = new Map<string, ChangedFile>()
  for (const changed of args.changedFiles) {
    changesByPath.set(changed.path, changed)
    if (changed.oldPath) changesByPath.set(changed.oldPath, changed)
  }

  const signals: BreakingSignal[] = []
  for (const surface of args.map.surfaces) {
    const changed = changesByPath.get(surface.path)
    if (!changed) continue
    const status = basenameStatus(changed.status)
    // 新增 surface 视为新能力引入，不按 breaking 处理；forward-only gate 聚焦改动/破坏已有契约。
    if (status === 'A') continue

    signals.push({
      surfaceId: surface.id,
      kind: surface.kind,
      path: surface.path,
      status: changed.status,
    })
  }

  return signals
}

const basenameStatus = (status: string): string => {
  if (!status) return status
  return status[0] ?? status
}

export const isVersionBumped = (beforeVersion: unknown, afterVersion: unknown): boolean => {
  if (typeof beforeVersion !== 'number' || typeof afterVersion !== 'number') return false
  return afterVersion > beforeVersion
}

const runVersionChecks = (args: {
  readonly mode: Mode
  readonly map: MigrationMap
  readonly changedFiles: ReadonlyArray<ChangedFile>
}): ReadonlyArray<Violation> => {
  const byPath = new Map<string, ChangedFile>()
  for (const file of args.changedFiles) {
    byPath.set(file.path, file)
  }

  const baseRef = getBaseRefForVersionRead(args.mode)
  const violations: Violation[] = []

  for (const check of args.map.versionChecks) {
    const changed = byPath.get(check.path)
    if (!changed) continue

    const status = basenameStatus(changed.status)
    if (status === 'D') continue
    if (!fs.existsSync(check.path)) continue

    const beforeContent = readGitBlob(baseRef, check.path)
    if (!beforeContent) continue

    let beforeVersion: unknown
    let afterVersion: unknown
    try {
      beforeVersion = readJsonPointer(beforeContent, check.pointer)
      afterVersion = readJsonPointer(fs.readFileSync(check.path, 'utf-8'), check.pointer)
    } catch (error) {
      violations.push({
        code: 'MIGRATION_MAP_INVALID',
        message: `version check parse failed for ${check.path}`,
        details: {
          checkId: check.id,
          pointer: check.pointer,
          error: error instanceof Error ? error.message : String(error),
        },
      })
      continue
    }

    if (typeof beforeVersion === 'undefined' || typeof afterVersion === 'undefined') {
      violations.push({
        code: 'MIGRATION_MAP_INVALID',
        message: `version pointer not found for ${check.path}`,
        details: {
          checkId: check.id,
          pointer: check.pointer,
          beforeVersion,
          afterVersion,
        },
      })
      continue
    }

    if (typeof beforeVersion !== 'number' || typeof afterVersion !== 'number') {
      violations.push({
        code: 'MIGRATION_MAP_INVALID',
        message: `version pointer must resolve to number for ${check.path}`,
        details: {
          checkId: check.id,
          path: check.path,
          pointer: check.pointer,
          beforeVersion,
          afterVersion,
        },
      })
      continue
    }

    if (!isVersionBumped(beforeVersion, afterVersion)) {
      violations.push({
        code: 'PROTOCOL_VERSION_NOT_BUMPED',
        message: `version field must increase for ${check.path}`,
        details: {
          checkId: check.id,
          path: check.path,
          pointer: check.pointer,
          beforeVersion,
          afterVersion,
        },
      })
    }
  }

  return violations
}

const markdownHasSection = (content: string, heading: string): boolean => {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^##\\s+${escaped}\\s*$`, 'm').test(content)
}

const extractFrontMatter = (content: string): string | undefined => {
  if (!content.startsWith('---\n')) return undefined
  const end = content.indexOf('\n---\n', 4)
  if (end < 0) return undefined
  return content.slice(4, end)
}

const frontMatterHasKey = (frontMatter: string, key: string): boolean => new RegExp(`^${key}\\s*:`, 'm').test(frontMatter)

const validateMigrationNotes = (args: {
  readonly map: MigrationMap
  readonly changedFiles: ReadonlyArray<ChangedFile>
  readonly breakingSignals: ReadonlyArray<BreakingSignal>
}): ReadonlyArray<Violation> => {
  const dirPrefix = `${args.map.migrationNotesDir}/`
  const noteChanges = args.changedFiles.filter((file) => {
    const status = basenameStatus(file.status)
    if (status === 'D') return false
    return file.path.startsWith(dirPrefix) && file.path.endsWith('.md')
  })

  const violations: Violation[] = []
  const hasBreaking = args.breakingSignals.length > 0

  if (hasBreaking && noteChanges.length === 0) {
    violations.push({
      code: 'BREAKING_CHANGE_WITHOUT_MIGRATION_NOTE',
      message: 'breaking surfaces changed but no migration note was updated',
      details: {
        expectedDir: args.map.migrationNotesDir,
        breakingSignals: args.breakingSignals,
      },
    })
    return violations
  }

  if (!hasBreaking) {
    return violations
  }

  const notesContent = new Map<string, string>()
  for (const note of noteChanges) {
    if (!fs.existsSync(note.path)) {
      violations.push({
        code: 'MIGRATION_NOTE_INVALID',
        message: `migration note missing on disk: ${note.path}`,
      })
      continue
    }

    const content = fs.readFileSync(note.path, 'utf-8')
    notesContent.set(note.path, content)

    const missingSections = args.map.requiredSections.filter((section) => !markdownHasSection(content, section))

    const frontMatter = extractFrontMatter(content)
    const missingFrontMatterKeys =
      typeof frontMatter === 'string'
        ? args.map.requiredFrontMatterKeys.filter((key) => !frontMatterHasKey(frontMatter, key))
        : args.map.requiredFrontMatterKeys

    if (missingSections.length > 0 || missingFrontMatterKeys.length > 0) {
      violations.push({
        code: 'MIGRATION_NOTE_INVALID',
        message: `migration note is missing required content: ${note.path}`,
        details: {
          note: note.path,
          missingSections,
          missingFrontMatterKeys,
        },
      })
    }
  }

  if (violations.some((item) => item.code === 'MIGRATION_NOTE_INVALID')) {
    return violations
  }

  const noteEntries = Array.from(notesContent.entries())
  const uncovered = args.breakingSignals.filter((signal) => {
    return !noteEntries.some(([, content]) => content.includes(signal.surfaceId) || content.includes(signal.path))
  })

  if (uncovered.length > 0) {
    violations.push({
      code: 'BREAKING_SURFACE_NOT_MAPPED_IN_NOTE',
      message: 'some breaking surfaces are not referenced in migration notes',
      details: {
        uncovered,
        notePaths: noteEntries.map(([notePath]) => notePath),
      },
    })
  }

  return violations
}

const emit = (payload: unknown, ok: boolean): void => {
  const text = JSON.stringify(payload, null, 2)
  if (ok) {
    // eslint-disable-next-line no-console
    console.log(text)
  } else {
    // eslint-disable-next-line no-console
    console.error(text)
  }
}

const main = (): void => {
  const mode = parseArgs(process.argv.slice(2))

  let map: MigrationMap
  try {
    map = loadMigrationMap()
  } catch (error) {
    const violation: Violation = {
      code: fs.existsSync(MIGRATION_TEMPLATE_PATH) ? 'MIGRATION_MAP_INVALID' : 'MIGRATION_MAP_NOT_FOUND',
      message: 'failed to load migration map',
      details: {
        template: MIGRATION_TEMPLATE_PATH,
        error: error instanceof Error ? error.message : String(error),
      },
    }

    emit(
      {
        ok: false,
        gate: 'gate:migration-forward-only',
        reasonCode: 'GATE_MIGRATION_FORWARD_ONLY_FAILED',
        reason: violation.code,
        violations: [violation],
      },
      false,
    )
    process.exit(1)
  }

  const changedFiles = getChangedFiles(mode)
  const breakingSignals = detectBreakingSignals({ map, changedFiles })

  const violations: Violation[] = [
    ...runVersionChecks({ mode, map, changedFiles }),
    ...validateMigrationNotes({ map, changedFiles, breakingSignals }),
  ]

  if (violations.length > 0) {
    emit(
      {
        ok: false,
        gate: map.gate,
        reasonCode: map.reasonCode,
        reason: violations[0]?.code ?? map.reasonCode,
        mode,
        breakingSignals,
        changedFiles,
        violations,
      },
      false,
    )
    process.exit(1)
  }

  emit(
    {
      ok: true,
      gate: map.gate,
      reasonCode: 'VERIFY_PASS',
      mode,
      breakingSignals,
      checked: {
        changedFileCount: changedFiles.length,
        breakingSignalCount: breakingSignals.length,
        migrationMap: path.relative(process.cwd(), MIGRATION_TEMPLATE_PATH),
      },
    },
    true,
  )
}

const isDirectRun = (): boolean => {
  const entry = process.argv[1]
  if (!entry) return false
  return pathToFileURL(path.resolve(entry)).href === import.meta.url
}

if (isDirectRun()) {
  main()
}
