# Logix Playground Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `@logixjs/playground` as the reusable docs/example Playground shell that opens curated React examples, shows source, renders a live React preview, and runs Logix Program Run/Check/startup Trial from one `ProjectSnapshot`.

**Architecture:** `packages/logix-playground` owns the product shell and public project declaration helpers. Sandpack, source workspace state, snapshot building, sandbox-backed runner, logs, errors and summaries stay under `src/internal/**`. `examples/logix-react` owns curated project data and routes; `@logixjs/sandbox` stays worker transport with no Playground product exports.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Vitest browser with Playwright, Effect V4, `@logixjs/core`, `@logixjs/react`, `@logixjs/sandbox`, `@codesandbox/sandpack-react`.

---

## Scope And Authority

This is the execution guide for `specs/164-logix-playground/`. Keep it aligned with:

- [spec.md](./spec.md)
- [plan.md](./plan.md)
- [tasks.md](./tasks.md)
- [contracts/README.md](./contracts/README.md)
- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)

Use `tasks.md` as the checklist. This file explains how to implement those tasks without inventing a second口径.

Execution constraints:

- Prefix every shell command with `rtk`.
- Do not run watch-mode tests.
- Do not run `git add`, `git commit`, `git push`, `git reset`, `git restore`, `git checkout --`, `git clean` or `git stash` unless the user explicitly requests it.
- Do not expose public `FileModel`, `ProgramEngine`, `PreviewAdapter`, `Evidence`, `PlaygroundRunResult`, `programExport` or `mainExport`.
- Do not add product UI or product contracts to `@logixjs/sandbox`.
- Do not change runtime core, sandbox protocol or React host lifecycle unless a failing witness proves it is required. If that happens, update [plan.md](./plan.md) and collect the perf evidence defined there.

Primary closure invariant:

```text
workspace edit
  -> revision increments
  -> ProjectSnapshot is rebuilt
  -> source panel, Sandpack preview, Program Run, Check and startup Trial consume that snapshot
```

## Task 1: Package Shell And Workspace Wiring

Maps to `T001` through `T007`.

**Files:**

- Create: `packages/logix-playground/package.json`
- Create: `packages/logix-playground/tsconfig.json`
- Create: `packages/logix-playground/tsconfig.test.json`
- Create: `packages/logix-playground/tsup.config.ts`
- Create: `packages/logix-playground/vitest.config.ts`
- Create: `packages/logix-playground/src/index.ts`
- Create: `packages/logix-playground/src/Playground.tsx`
- Create: `packages/logix-playground/src/Project.ts`
- Create: `packages/logix-playground/src/internal/**`
- Create: `packages/logix-playground/test/**`
- Modify: `examples/logix-react/package.json`
- Modify: `examples/logix-react/vite.config.ts`

**Step 1: Create package metadata**

Use this public export shape in `packages/logix-playground/package.json`:

```json
{
  "name": "@logixjs/playground",
  "version": "1.0.2-beta.1",
  "license": "Apache-2.0",
  "type": "module",
  "files": ["dist/**"],
  "main": "./src/index.ts",
  "module": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    "./package.json": "./package.json",
    ".": "./src/index.ts",
    "./Playground": "./src/Playground.tsx",
    "./Project": "./src/Project.ts",
    "./internal/*": null
  },
  "publishConfig": {
    "access": "public",
    "exports": {
      "./package.json": "./package.json",
      ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.js",
        "require": "./dist/index.cjs"
      },
      "./Playground": {
        "types": "./dist/Playground.d.ts",
        "import": "./dist/Playground.js",
        "require": "./dist/Playground.cjs"
      },
      "./Project": {
        "types": "./dist/Project.d.ts",
        "import": "./dist/Project.js",
        "require": "./dist/Project.cjs"
      },
      "./internal/*": null
    },
    "main": "./dist/index.cjs",
    "module": "./dist/index.js",
    "types": "./dist/index.d.ts"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "typecheck:test": "tsc -p tsconfig.test.json --noEmit",
    "test": "vitest run",
    "test:changed": "vitest run --changed",
    "test:cache": "vitest run --cache"
  },
  "dependencies": {
    "@codesandbox/sandpack-react": "^2.20.0",
    "@logixjs/core": "workspace:*",
    "@logixjs/react": "workspace:*",
    "@logixjs/sandbox": "workspace:*",
    "effect": "4.0.0-beta.28"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.1",
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2",
    "jsdom": "24.0.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "tsup": "^8.5.1",
    "typescript": "^5.9.3",
    "vitest": "^4.0.15"
  },
  "peerDependencies": {
    "react": ">=19.0.0",
    "react-dom": ">=19.0.0"
  }
}
```

After editing dependencies, update the lockfile:

```bash
rtk pnpm install --lockfile-only
```

Expected: lockfile updates successfully. If network or registry fails, record the blocker in `specs/164-logix-playground/notes/verification.md`.

**Step 2: Create config files**

Use `packages/logix-react` and `packages/logix-sandbox` as the local template.

`packages/logix-playground/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2021", "DOM"],
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*", "test/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

`packages/logix-playground/tsconfig.test.json`:

```json
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*", "test/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

`packages/logix-playground/tsup.config.ts`:

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/Playground.tsx', 'src/Project.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: [
    '@codesandbox/sandpack-react',
    '@logixjs/core',
    '@logixjs/react',
    '@logixjs/sandbox',
    'effect',
    'react',
    'react-dom',
  ],
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.js' : '.cjs',
    }
  },
})
```

`packages/logix-playground/vitest.config.ts`:

```ts
import { defineConfig, mergeConfig } from 'vitest/config'
import { sharedConfig } from '../../vitest.shared'

export default mergeConfig(
  defineConfig(sharedConfig),
  defineConfig({
    test: {
      environment: 'happy-dom',
      include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
      exclude: ['test/browser/**'],
    },
  }),
)
```

**Step 3: Add placeholder public files**

Keep placeholders small. They only exist so tests can compile.

`packages/logix-playground/src/index.ts`:

```ts
export { PlaygroundPage } from './Playground.js'
export type {
  PlaygroundFile,
  PlaygroundFileLanguage,
  PlaygroundProject,
  PlaygroundRegistry,
} from './Project.js'
export {
  definePlaygroundProject,
  definePlaygroundRegistry,
  resolvePlaygroundProject,
} from './Project.js'
```

`packages/logix-playground/src/Playground.tsx`:

```tsx
import React from 'react'
import type { PlaygroundRegistry } from './Project.js'

export interface PlaygroundPageProps {
  readonly registry: PlaygroundRegistry
  readonly projectId: string
}

export function PlaygroundPage({ projectId }: PlaygroundPageProps): React.ReactElement {
  return <div data-logix-playground-page="true">Playground: {projectId}</div>
}
```

`packages/logix-playground/src/Project.ts` starts with exported types from Task 2.

**Step 4: Add example app alias and dependency**

Modify `examples/logix-react/package.json` dependencies:

```json
"@logixjs/playground": "workspace:*"
```

Modify `examples/logix-react/vite.config.ts`:

```ts
{ find: /^@logixjs\/playground$/, replacement: path.resolve(__dirname, '../../packages/logix-playground/src/index.ts') },
{ find: /^@logixjs\/playground\/Playground$/, replacement: path.resolve(__dirname, '../../packages/logix-playground/src/Playground.tsx') },
{ find: /^@logixjs\/playground\/Project$/, replacement: path.resolve(__dirname, '../../packages/logix-playground/src/Project.ts') },
```

Add `@logixjs/playground` to `optimizeDeps.exclude`.

**Step 5: Run the package smoke checks**

```bash
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-playground test
rtk pnpm -C examples/logix-react typecheck
```

Expected initially: typecheck can pass after placeholders. Tests may report no test files until Task 2.

**Step 6: Review diff only**

```bash
rtk git status --short -- packages/logix-playground examples/logix-react pnpm-lock.yaml
```

Expected: new package files and example metadata changes are visible. Do not stage or commit.

## Task 2: Public Project Contract And Registry

Maps to `T008`, `T009`, `T012`, `T013`, `T018`, and part of `T052`.

**Files:**

- Create: `packages/logix-playground/test/public-surface.contract.test.ts`
- Create: `packages/logix-playground/test/project.contract.test.ts`
- Modify: `packages/logix-playground/src/index.ts`
- Modify: `packages/logix-playground/src/Project.ts`
- Create: `packages/logix-playground/src/internal/project/project.ts`
- Create: `packages/logix-playground/src/internal/project/registry.ts`

**Step 1: Write the failing public surface guard**

`packages/logix-playground/test/public-surface.contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const packageJsonPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../package.json',
)

describe('@logixjs/playground public surface', () => {
  it('exposes only shell-first public subpaths', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      exports: Record<string, unknown>
    }

    expect(Object.keys(packageJson.exports).sort()).toEqual([
      '.',
      './Playground',
      './Project',
      './internal/*',
      './package.json',
    ])
    expect(packageJson.exports['./internal/*']).toBeNull()
  })

  it('does not export internal product nouns from root', async () => {
    const root = await import('../src/index.js')
    const keys = Object.keys(root).sort()

    expect(keys).toContain('PlaygroundPage')
    expect(keys).toContain('definePlaygroundProject')
    expect(keys).toContain('definePlaygroundRegistry')
    expect(keys).toContain('resolvePlaygroundProject')
    expect(keys).not.toContain('FileModel')
    expect(keys).not.toContain('ProgramEngine')
    expect(keys).not.toContain('PreviewAdapter')
    expect(keys).not.toContain('Evidence')
    expect(keys).not.toContain('PlaygroundRunResult')
  })
})
```

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/public-surface.contract.test.ts
```

Expected before implementation: FAIL if exports are missing.

**Step 2: Write project declaration tests**

`packages/logix-playground/test/project.contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  definePlaygroundProject,
  definePlaygroundRegistry,
  resolvePlaygroundProject,
} from '../src/Project.js'
import { normalizePlaygroundProject } from '../src/internal/project/project.js'

describe('PlaygroundProject contract', () => {
  it('accepts minimal preview and Program entries with fixed Program/main convention', () => {
    const project = definePlaygroundProject({
      id: 'logix-react.local-counter',
      files: {
        '/src/App.tsx': { language: 'tsx', content: 'export function App() { return null }', editable: true },
        '/src/program.ts': {
          language: 'ts',
          content: 'export const Program = {}\\nexport const main = () => undefined',
          editable: true,
        },
      },
      preview: { entry: '/src/App.tsx' },
      program: { entry: '/src/program.ts' },
      capabilities: { preview: true, run: true, check: true, trialStartup: true },
      fixtures: {},
    })

    const normalized = normalizePlaygroundProject(project)

    expect(normalized.id).toBe('logix-react.local-counter')
    expect(normalized.preview?.entry).toBe('/src/App.tsx')
    expect(normalized.program?.entry).toBe('/src/program.ts')
  })

  it('rejects invalid ids and missing entries', () => {
    expect(() =>
      normalizePlaygroundProject({
        id: 'Bad Id',
        files: {},
        preview: { entry: '/src/App.tsx' },
      }),
    ).toThrow(/id/)
  })

  it('does not accept custom Program export names at runtime boundary', () => {
    expect(() =>
      normalizePlaygroundProject({
        id: 'logix-react.bad-program-export',
        files: {
          '/src/program.ts': {
            language: 'ts',
            content: 'export const CustomProgram = {}',
            editable: true,
          },
        },
        program: {
          entry: '/src/program.ts',
          // @ts-expect-error custom export names are forbidden in v1
          programExport: 'CustomProgram',
        },
      }),
    ).toThrow(/programExport|mainExport|fixed exports/)
  })

  it('resolves projects from array and record registries', () => {
    const project = definePlaygroundProject({
      id: 'logix-react.registry-proof',
      files: {
        '/src/App.tsx': { language: 'tsx', content: 'export default null', editable: true },
      },
      preview: { entry: '/src/App.tsx' },
    })

    expect(resolvePlaygroundProject(definePlaygroundRegistry([project]), project.id)).toBe(project)
    expect(resolvePlaygroundProject(definePlaygroundRegistry({ [project.id]: project }), project.id)).toBe(project)
    expect(resolvePlaygroundProject([project], 'missing')).toBeUndefined()
  })
})
```

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/project.contract.test.ts
```

Expected before implementation: FAIL because project helpers are incomplete.

**Step 3: Implement public types**

`packages/logix-playground/src/Project.ts`:

```ts
export type PlaygroundFileLanguage = 'ts' | 'tsx' | 'js' | 'jsx' | 'json' | 'css' | 'md'

export interface PlaygroundFile {
  readonly language: PlaygroundFileLanguage
  readonly content: string
  readonly editable?: boolean
}

export interface PlaygroundPreviewEntry {
  readonly entry: string
}

export interface PlaygroundProgramEntry {
  readonly entry: string
}

export interface PlaygroundCapabilities {
  readonly preview?: boolean
  readonly run?: boolean
  readonly check?: boolean
  readonly trialStartup?: boolean
}

export interface PlaygroundProject {
  readonly id: string
  readonly files: Readonly<Record<string, PlaygroundFile>>
  readonly preview?: PlaygroundPreviewEntry
  readonly program?: PlaygroundProgramEntry
  readonly capabilities?: PlaygroundCapabilities
  readonly fixtures?: unknown
}

export type PlaygroundRegistry =
  | ReadonlyArray<PlaygroundProject>
  | Readonly<Record<string, PlaygroundProject>>

export const definePlaygroundProject = <P extends PlaygroundProject>(project: P): P => project

export const definePlaygroundRegistry = <R extends PlaygroundRegistry>(registry: R): R => registry

export const resolvePlaygroundProject = (
  registry: PlaygroundRegistry,
  projectId: string,
): PlaygroundProject | undefined => {
  if (Array.isArray(registry)) {
    return registry.find((project) => project.id === projectId)
  }
  return registry[projectId]
}
```

**Step 4: Implement internal normalization**

`packages/logix-playground/src/internal/project/project.ts`:

```ts
import type { PlaygroundProject } from '../../Project.js'

const projectIdPattern = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/

const normalizePath = (path: string): string => {
  const normalized = path.replaceAll('\\\\', '/')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

const assertNoForbiddenProgramKeys = (program: unknown): void => {
  if (typeof program !== 'object' || program === null) return
  if ('programExport' in program || 'mainExport' in program) {
    throw new Error('Playground Program entries use fixed exports Program and main')
  }
}

export const normalizePlaygroundProject = (project: PlaygroundProject): PlaygroundProject => {
  if (!projectIdPattern.test(project.id)) {
    throw new Error(`Invalid PlaygroundProject id: ${project.id}`)
  }
  if (!project.preview && !project.program) {
    throw new Error(`PlaygroundProject ${project.id} must define preview or program`)
  }

  const files = Object.fromEntries(
    Object.entries(project.files).map(([filePath, file]) => [normalizePath(filePath), file]),
  )

  const hasFile = (filePath: string | undefined): boolean =>
    filePath !== undefined && Object.prototype.hasOwnProperty.call(files, normalizePath(filePath))

  if (project.preview && !hasFile(project.preview.entry)) {
    throw new Error(`Preview entry does not exist: ${project.preview.entry}`)
  }

  assertNoForbiddenProgramKeys(project.program)
  if (project.program && !hasFile(project.program.entry)) {
    throw new Error(`Program entry does not exist: ${project.program.entry}`)
  }

  return {
    ...project,
    files,
    preview: project.preview ? { entry: normalizePath(project.preview.entry) } : undefined,
    program: project.program ? { entry: normalizePath(project.program.entry) } : undefined,
  }
}
```

**Step 5: Implement registry lookup**

`packages/logix-playground/src/internal/project/registry.ts` can call `resolvePlaygroundProject` and `normalizePlaygroundProject`.

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/public-surface.contract.test.ts test/project.contract.test.ts
```

Expected after implementation: PASS.

## Task 3: Workspace, Snapshot And Deterministic Identity

Maps to `T010`, `T014`, `T015`, `T016`, and `T043`.

**Files:**

- Create: `packages/logix-playground/test/project-snapshot.contract.test.ts`
- Create: `packages/logix-playground/test/support/projectFixtures.ts`
- Create: `packages/logix-playground/src/internal/session/workspace.ts`
- Create: `packages/logix-playground/src/internal/snapshot/identity.ts`
- Create: `packages/logix-playground/src/internal/snapshot/projectSnapshot.ts`

**Step 1: Write snapshot law tests**

Test these cases:

- opening a project starts at revision `0`
- editing a file increments revision
- reset increments revision and restores original content
- snapshot includes visible files, generated files, entries, dependencies, fixtures, diagnostics and deterministic env seed
- internal runner receives only the snapshot object in tests

Minimal test shape:

```ts
import { describe, expect, it } from 'vitest'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('ProjectSnapshot law', () => {
  it('rebuilds one execution coordinate per revision', () => {
    const workspace = createPlaygroundWorkspace(localCounterProjectFixture, { sessionSeed: 'test-seed' })
    const first = createProjectSnapshot(workspace)

    workspace.editFile('/src/logic/localCounter.logic.ts', 'export const delta = 2')
    const second = createProjectSnapshot(workspace)

    expect(first.revision).toBe(0)
    expect(second.revision).toBe(1)
    expect(second.projectId).toBe('logix-react.local-counter')
    expect(second.envSeed).toBe(first.envSeed)
    expect(second.files.get('/src/logic/localCounter.logic.ts')?.content).toContain('delta = 2')
  })
})
```

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/project-snapshot.contract.test.ts
```

Expected before implementation: FAIL.

**Step 2: Implement identity helpers**

`packages/logix-playground/src/internal/snapshot/identity.ts`:

```ts
export const stableHash = (input: string): string => {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export const makeEnvSeed = (projectId: string, sessionSeed = 'default'): string =>
  `env:${stableHash(`${projectId}:${sessionSeed}`)}`

export const makeRunId = (projectId: string, revision: number, kind: string, seq: number): string =>
  `${projectId}:${kind}:r${revision}:op${seq}`
```

**Step 3: Implement workspace**

`workspace.ts` should expose a small mutable object, no React state:

```ts
export interface PlaygroundWorkspace {
  readonly projectId: string
  readonly originalProject: PlaygroundProject
  readonly sessionSeed: string
  readonly files: ReadonlyMap<string, WorkspaceFile>
  readonly dirtyFiles: ReadonlySet<string>
  readonly activeFile: string
  readonly revision: number
  editFile(path: string, content: string): void
  resetFiles(): void
  setActiveFile(path: string): void
}
```

Keep mutation local to this object. Preview adapter and runner must not call `editFile`.

**Step 4: Implement snapshot builder**

`projectSnapshot.ts` internal shape:

```ts
export interface ProjectSnapshot {
  readonly projectId: string
  readonly revision: number
  readonly files: ReadonlyMap<string, ProjectSnapshotFile>
  readonly generatedFiles: ReadonlyMap<string, ProjectSnapshotFile>
  readonly previewEntry?: { readonly entry: string }
  readonly programEntry?: { readonly entry: string }
  readonly dependencies: Readonly<Record<string, string>>
  readonly fixtures: unknown
  readonly diagnostics: { readonly check: boolean; readonly trialStartup: boolean }
  readonly envSeed: string
}
```

V1 dependencies may be internal defaults:

```ts
const defaultDependencies = {
  '@logixjs/core': 'workspace',
  '@logixjs/react': 'workspace',
  effect: '4.0.0-beta.28',
  react: '19',
  'react-dom': '19',
} as const
```

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/project-snapshot.contract.test.ts
```

Expected after implementation: PASS.

## Task 4: Derived Summary, Logs And Errors

Maps to `T011`, `T044`, `T047`, `T048`, `T050`, and part of `T051`.

**Files:**

- Create: `packages/logix-playground/test/derived-summary.contract.test.ts`
- Create: `packages/logix-playground/src/internal/session/logs.ts`
- Create: `packages/logix-playground/src/internal/session/errors.ts`
- Create: `packages/logix-playground/src/internal/summary/derivedSummary.ts`
- Modify: `packages/logix-playground/src/internal/session/workspace.ts`

**Step 1: Write failing summary tests**

Assert:

- summary is derived from current workspace/sessions
- changed files are sorted
- preview crash, compile failure, Run failure and Trial failure produce distinct `kind`
- logs and errors truncate deterministically
- summary is JSON-safe

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/derived-summary.contract.test.ts
```

Expected before implementation: FAIL.

**Step 2: Implement bounded log capture**

`logs.ts`:

```ts
export interface BoundedLogEntry {
  readonly level: 'debug' | 'info' | 'warn' | 'error'
  readonly message: string
  readonly source: 'preview' | 'runner' | 'compile'
}

export const appendBoundedLog = (
  logs: ReadonlyArray<BoundedLogEntry>,
  entry: BoundedLogEntry,
  maxEntries = 100,
): ReadonlyArray<BoundedLogEntry> => [...logs, entry].slice(-maxEntries)
```

**Step 3: Implement error classification**

`errors.ts`:

```ts
export type PlaygroundFailureKind =
  | 'preview'
  | 'compile'
  | 'run'
  | 'trialStartup'
  | 'timeout'
  | 'serialization'
  | 'worker'
  | 'unavailable'

export interface ClassifiedPlaygroundFailure {
  readonly kind: PlaygroundFailureKind
  readonly message: string
  readonly stack?: string
}

export const classifyError = (
  kind: PlaygroundFailureKind,
  error: unknown,
): ClassifiedPlaygroundFailure => ({
  kind,
  message: error instanceof Error ? error.message : String(error),
  stack: error instanceof Error ? error.stack : undefined,
})
```

**Step 4: Implement summary projection**

`derivedSummary.ts` should accept workspace snapshot plus optional preview and program sessions. Do not store summary inside workspace.

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/derived-summary.contract.test.ts
```

Expected after implementation: PASS.

## Task 5: Playground UI Shell

Maps to `T019`, `T022`, `T023`, `T026`, `T027`, `T040`, `T041`, `T045`, `T049`, and `T051`.

**Files:**

- Create: `packages/logix-playground/test/default-ui-hierarchy.contract.test.tsx`
- Create: `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
- Create: `packages/logix-playground/src/internal/components/PlaygroundErrorBoundary.tsx`
- Create: `packages/logix-playground/src/internal/components/SourcePanel.tsx`
- Create: `packages/logix-playground/src/internal/components/PreviewControls.tsx`
- Create: `packages/logix-playground/src/internal/components/ProgramPanel.tsx`
- Modify: `packages/logix-playground/src/Playground.tsx`

**Step 1: Write failing UI hierarchy test**

`default-ui-hierarchy.contract.test.tsx` should render `PlaygroundPage` with a fixture registry and assert:

- source panel exists
- preview panel exists
- run panel exists
- Check/Trial controls exist
- Check/Trial results are not auto-expanded
- Check/Trial actions are not invoked on initial render

Use `@testing-library/react`:

```ts
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlaygroundPage } from '../src/Playground.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('default Playground UI hierarchy', () => {
  it('keeps Source, Preview and Run primary with diagnostics on demand', () => {
    render(<PlaygroundPage registry={[localCounterProjectFixture]} projectId="logix-react.local-counter" />)

    expect(screen.getByRole('region', { name: 'Source' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Preview' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Run' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Check' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Trial' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Check report' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Trial report' })).toBeNull()
  })
})
```

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/default-ui-hierarchy.contract.test.tsx
```

Expected before implementation: FAIL.

**Step 2: Implement shell layout**

Keep markup stable for tests:

- `<section aria-label="Source">`
- `<section aria-label="Preview">`
- `<section aria-label="Run">`
- buttons named `Run`, `Check`, `Trial`, `Reset`, `Reload preview`

Use plain CSS class names or inline layout first. Avoid introducing a new design system dependency in this package.

**Step 3: Implement public page**

`PlaygroundPage` should:

- resolve project from registry
- render a bounded not-found state when missing
- normalize project
- create workspace once per `projectId`
- pass workspace and current snapshot into `PlaygroundShell`

**Step 4: Implement source panel**

`SourcePanel` should:

- list visible project files
- show active file content in a textarea or Sandpack-owned editor mount
- call `workspace.editFile(path, content)` through parent state
- preserve stable file paths

**Step 5: Implement diagnostics controls on demand**

`ProgramPanel` should:

- expose Run as the primary action
- expose Check and Trial as separate buttons
- display unavailable state when capability is disabled
- keep Check/Trial collapsed until user action

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/default-ui-hierarchy.contract.test.tsx
```

Expected after implementation: PASS.

## Task 6: Sandpack Preview Adapter

Maps to `T020`, `T024`, `T025`, and part of `T046`.

**Files:**

- Create: `packages/logix-playground/src/internal/adapters/sandpack.tsx`
- Create: `packages/logix-playground/src/internal/session/previewSession.ts`
- Modify: `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
- Test: `examples/logix-react/test/browser/playground-preview.contract.test.tsx`

**Step 1: Define an internal adapter boundary**

`sandpack.tsx` should export internal functions only:

```ts
export interface InternalPreviewAdapterProps {
  readonly snapshot: ProjectSnapshot
  readonly onReady?: () => void
  readonly onError?: (error: unknown) => void
}
```

Do not export adapter types from `src/index.ts`, `src/Playground.tsx` or `src/Project.ts`.

**Step 2: Map snapshot files to Sandpack files**

The adapter should:

- convert `snapshot.files` and `snapshot.generatedFiles` into Sandpack file entries
- set active file to `snapshot.previewEntry.entry`
- provide dependencies from `snapshot.dependencies`
- mount a preview using `SandpackProvider`, `SandpackLayout`, `SandpackCodeEditor` if used, and `SandpackPreview`

**Step 3: Keep source authority in workspace**

If Sandpack editor is used, bridge edits back to workspace immediately. Avoid letting Sandpack become the only owner of current source. The source panel and Program runner must read `ProjectSnapshot`.

**Step 4: Add preview browser test later with example route**

The browser test belongs to Task 8 because it needs a real `examples/logix-react` route.

## Task 7: Internal Program Runner

Maps to `T032`, `T033`, `T034`, `T036`, `T037`, `T038`, `T039`, `T040`, `T042`, and `T043`.

**Files:**

- Create: `packages/logix-playground/test/program-runner.contract.test.ts`
- Create: `packages/logix-playground/test/trial-startup.boundary.test.ts`
- Create: `packages/logix-playground/test/shape-separation.contract.test.ts`
- Create: `packages/logix-playground/src/internal/runner/programWrapper.ts`
- Create: `packages/logix-playground/src/internal/runner/runProjection.ts`
- Create: `packages/logix-playground/src/internal/runner/controlPlaneRunner.ts`
- Create: `packages/logix-playground/src/internal/runner/sandboxRunner.ts`
- Modify: `packages/logix-playground/src/internal/components/ProgramPanel.tsx`

**Step 1: Write runner tests with a fake transport**

Do not require a real browser worker for package unit tests. Create an internal transport interface inside `sandboxRunner.ts`:

```ts
interface InternalSandboxTransport {
  readonly init: () => Promise<void>
  readonly compile: (code: string, filename?: string) => Promise<{ success: boolean; errors?: string[] }>
  readonly run: (options: { readonly runId: string }) => Promise<{ readonly stateSnapshot?: unknown; readonly logs?: readonly unknown[] }>
  readonly trial: (options: { readonly moduleCode: string; readonly moduleExport?: string; readonly runId: string }) => Promise<{ readonly stateSnapshot?: unknown }>
}
```

Tests inject fakes into internal runner factory. Public API stays clean.

**Step 2: Assert Program Run shape**

`program-runner.contract.test.ts` should prove:

- wrapper uses fixed `Program` and `main`
- `Runtime.run(Program, main, options)` result becomes bounded JSON-safe projection
- projection has stable run id
- projection does not contain control-plane report fields

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/program-runner.contract.test.ts
```

Expected before implementation: FAIL.

**Step 3: Assert startup Trial boundary**

`trial-startup.boundary.test.ts` should prove:

- only `trialStartup` exists in v1 runner
- scenario/replay/compare are unavailable
- Trial output is treated as core `VerificationControlPlaneReport`

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/trial-startup.boundary.test.ts
```

Expected before implementation: FAIL.

**Step 4: Assert shape separation**

`shape-separation.contract.test.ts`:

```ts
import { ControlPlane } from '@logixjs/core'

expect(ControlPlane.isVerificationControlPlaneReport(runProjection)).toBe(false)
expect(ControlPlane.isVerificationControlPlaneReport(trialReport)).toBe(true)
```

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/shape-separation.contract.test.ts
```

Expected before implementation: FAIL.

**Step 5: Implement wrapper generation**

`programWrapper.ts` should generate wrapper source that imports or inlines snapshot files and executes:

```ts
const result = yield* Logix.Runtime.run(Program, main, options)
return result
```

For `check`:

```ts
const report = yield* Logix.Runtime.check(Program, options)
return report
```

For `trialStartup`:

```ts
const report = yield* Logix.Runtime.trial(Program, { ...options, mode: 'startup' })
return report
```

Use fixed names only: `Program` and `main`.

**Step 6: Implement bounded run projection**

`runProjection.ts` should:

- return JSON-safe values
- cap depth, array length and string length
- classify serialization failure separately
- never add `kind: "VerificationControlPlaneReport"`

**Step 7: Implement sandbox-backed runner**

`sandboxRunner.ts` default transport may use `SandboxClientLayer` or direct `createSandboxClient` if package internals need the class. Prefer the public Effect service route when possible. Keep all sandbox-specific types internal.

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/program-runner.contract.test.ts test/trial-startup.boundary.test.ts test/shape-separation.contract.test.ts
```

Expected after implementation: PASS.

## Task 8: Curated Example Integration

Maps to `T020`, `T021`, `T028`, `T029`, `T030`, `T031`, `T035`, and `T042`.

**Files:**

- Create: `examples/logix-react/src/playground/projects/local-counter.ts`
- Create: `examples/logix-react/src/playground/registry.ts`
- Create: `examples/logix-react/src/playground/routes.tsx`
- Create: `examples/logix-react/test/playground-registry.contract.test.ts`
- Create: `examples/logix-react/test/browser/playground-preview.contract.test.tsx`
- Modify: `examples/logix-react/src/App.tsx`

**Step 1: Write registry contract test**

`examples/logix-react/test/playground-registry.contract.test.ts` should assert:

- registry contains `logix-react.local-counter`
- project has preview and program entries
- referenced files exist in the project declaration
- no docs-owned duplicate registry is required
- fixed Program/main export convention is visible in source

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts
```

Expected before implementation: FAIL.

**Step 2: Create curated local counter project**

`examples/logix-react/src/playground/projects/local-counter.ts` exports one `PlaygroundProject`. Keep source strings compact and readable. Include at least:

- `/src/logic/localCounter.logic.ts`
- `/src/App.tsx`
- `/src/program.ts`

`/src/program.ts` must export:

```ts
export const Program = Logix.Program.make(...)
export const main = (...) => Effect.gen(...)
```

**Step 3: Create registry**

`examples/logix-react/src/playground/registry.ts`:

```ts
import { definePlaygroundRegistry } from '@logixjs/playground/Project'
import { localCounterPlaygroundProject } from './projects/local-counter.js'

export const logixReactPlaygroundRegistry = definePlaygroundRegistry([
  localCounterPlaygroundProject,
])

export const logixReactPlaygroundProjectIndex = logixReactPlaygroundRegistry
```

**Step 4: Add route wrapper**

`examples/logix-react/src/playground/routes.tsx`:

```tsx
import { PlaygroundPage } from '@logixjs/playground/Playground'
import { useParams } from 'react-router-dom'
import { logixReactPlaygroundRegistry } from './registry.js'

export function LogixReactPlaygroundRoute() {
  const params = useParams()
  return (
    <PlaygroundPage
      registry={logixReactPlaygroundRegistry}
      projectId={params.id ?? ''}
    />
  )
}
```

**Step 5: Wire route in App**

Modify `examples/logix-react/src/App.tsx`:

- import `LogixReactPlaygroundRoute`
- add `/playground/:id` route
- add an "Open in Playground" link for local counter or overview
- include `/playground/logix-react.local-counter` in known route handling if needed

**Step 6: Write browser test**

`examples/logix-react/test/browser/playground-preview.contract.test.tsx` should open the app route and assert:

- source content visible
- preview renders non-empty counter UI
- clicking increment changes visible state
- editing shared logic changes preview or run output once edit wiring exists
- reset clears captured failure state

Run:

```bash
rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-preview.contract.test.tsx --project browser
```

Expected before full implementation: FAIL. Expected after Task 8: PASS for AM-04 and AM-08.

## Task 9: Docs Consumer And Sandbox Boundary

Maps to `T052` through `T062`.

**Files:**

- Create: `packages/logix-playground/test/docs-consumer.contract.test.ts`
- Create: `packages/logix-playground/test/support/docsConsumerFixture.tsx`
- Modify: `packages/logix-playground/src/Project.ts`
- Modify: `packages/logix-playground/src/internal/project/registry.ts`
- Create: `packages/logix-sandbox/test/SandboxPublicSurface.contract.test.ts`
- Verify: `packages/logix-sandbox/src/index.ts`
- Verify: `packages/logix-sandbox/package.json`
- Verify: `packages/logix-sandbox/src/Types.ts`

**Step 1: Write docs consumer test**

Assert docs-style usage:

```tsx
<PlaygroundPage registry={registry} projectId="logix-react.local-counter" />
```

The test should not import shell internals.

Run:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/docs-consumer.contract.test.ts
```

Expected before implementation: FAIL if docs fixture requires unavailable public helpers.

**Step 2: Add sandbox public surface guard**

`packages/logix-sandbox/test/SandboxPublicSurface.contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

describe('@logixjs/sandbox public surface', () => {
  it('keeps root exports transport-only', async () => {
    const sandbox = await import('@logixjs/sandbox')
    expect(Object.keys(sandbox).sort()).toEqual(['SandboxClientLayer', 'SandboxClientTag'])
  })

  it('does not expose Playground product subpaths', () => {
    const packageJsonPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../package.json',
    )
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      exports: Record<string, unknown>
    }

    expect(Object.keys(packageJson.exports).sort()).toEqual([
      '.',
      './internal/*',
      './package.json',
      './vite',
    ])
    expect(JSON.stringify(packageJson.exports)).not.toMatch(/Playground|ProgramEngine|PreviewAdapter|PlaygroundRunResult/)
  })
})
```

Run:

```bash
rtk pnpm -C packages/logix-sandbox exec vitest run test/SandboxPublicSurface.contract.test.ts
```

Expected: PASS without sandbox source changes. If it fails, remove product leakage from sandbox.

**Step 3: Run forbidden vocabulary sweep**

```bash
rtk rg -n "PlaygroundRunResult|RUN_EXAMPLE|RUNTIME_CHECK|RUNTIME_TRIAL|programExport|mainExport" packages/logix-sandbox/src packages/logix-sandbox/package.json specs/164-logix-playground
```

Expected: no sandbox source/package hits. Remaining spec hits must be negative or forbidden-shape references and recorded in `specs/164-logix-playground/notes/verification.md`.

## Task 10: Verification, Notes And Status Writeback

Maps to `T063` through `T080`.

**Files:**

- Create: `specs/164-logix-playground/notes/verification.md`
- Create: `specs/164-logix-playground/notes/perf-evidence.md`
- Modify if needed: `specs/164-logix-playground/spec.md`
- Modify if needed: `specs/164-logix-playground/plan.md`
- Modify if needed: `specs/164-logix-playground/contracts/README.md`
- Modify if needed: `specs/164-logix-playground/data-model.md`
- Modify if needed: `docs/ssot/runtime/01-public-api-spine.md`
- Modify if needed: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify if needed: `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- Modify if needed: `docs/standards/logix-api-next-guardrails.md`

**Step 1: Run narrow package gates**

```bash
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-playground test
rtk pnpm -C examples/logix-react typecheck
rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-preview.contract.test.tsx --project browser
rtk pnpm -C packages/logix-sandbox exec vitest run test/SandboxPublicSurface.contract.test.ts
```

Expected: all pass.

**Step 2: Run AM-14 text sweep**

```bash
rtk rg -n "PlaygroundRunResult|RUN_EXAMPLE|RUNTIME_CHECK|RUNTIME_TRIAL|programExport|mainExport" packages/logix-sandbox/src packages/logix-sandbox/package.json specs/164-logix-playground
```

Expected: no live sandbox leakage. Spec-only negative references are classified in `notes/verification.md`.

**Step 3: Run workspace gates**

```bash
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

Expected: all pass or every failure is classified as pre-existing/unrelated with evidence. Fix touched-file failures.

**Step 4: Record verification**

`specs/164-logix-playground/notes/verification.md` should list AM-01 through AM-14:

````md
# Verification Notes: Logix Playground

## AM-01 public surface

Command:

```bash
rtk pnpm -C packages/logix-playground exec vitest run test/public-surface.contract.test.ts
```

Result: passed.
````

Repeat for every AM witness.

**Step 5: Record perf evidence**

`specs/164-logix-playground/notes/perf-evidence.md` should say whether any of these changed:

- runtime core
- sandbox worker protocol
- React host lifecycle

If none changed, record that browser witness timing and bounded projection tests satisfy this spec. If any changed, run the perf commands from [plan.md](./plan.md).

**Step 6: Write back changed authority**

Only update SSoT or standards pages if implementation changes runtime vocabulary, control-plane semantics or public-surface guard vocabulary. Otherwise record no writeback needed in `notes/verification.md`.

**Step 7: Move status**

Move `spec.md` to `Done` only after all AM witnesses pass and writebacks are complete.

Use:

```bash
rtk .codex/skills/speckit/scripts/bash/update-spec-status.sh --ensure --status Done --feature 164
```

Expected: status becomes `Done`.

## Execution Order

Recommended order:

1. Task 1 package shell.
2. Task 2 public project contract.
3. Task 3 workspace and snapshot.
4. Task 4 summary/log/error foundation.
5. Task 7 internal runner tests and implementation with fake transport.
6. Task 5 UI shell.
7. Task 6 Sandpack preview adapter.
8. Task 8 example route and browser proof.
9. Task 9 docs consumer and sandbox guards.
10. Task 10 verification and writeback.

Parallel work is possible after Task 3:

- UI shell and runner can be developed separately if both consume `ProjectSnapshot`.
- Sandbox boundary guard can be added early because it should pass without product changes.
- Docs consumer contract can be written once `PlaygroundPage` props and registry helpers are stable.

## Done Checklist

- [ ] `packages/logix-playground` exists and typechecks.
- [ ] Public exports match AM-01.
- [ ] `ProjectSnapshot` is the only execution coordinate.
- [ ] Source, preview and Program runner observe the same revision.
- [ ] Run projection and Check/Trial reports are shape-separated.
- [ ] Startup Trial is the only Trial mode exposed in Playground v1.
- [ ] `examples/logix-react` exposes `/playground/logix-react.local-counter`.
- [ ] Browser test proves preview interaction.
- [ ] Browser test proves edit propagation to preview and Program Run.
- [ ] Docs-style consumer renders `PlaygroundPage` from public API.
- [ ] Sandbox root remains transport-only.
- [ ] AM-01 through AM-14 are recorded in `notes/verification.md`.
- [ ] `notes/perf-evidence.md` is written.
- [ ] Required docs/spec writebacks are complete.
- [ ] `spec.md` status is `Done`.
