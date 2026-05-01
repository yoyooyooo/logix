# CLI Agent First Control Plane Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `160-cli-agent-first-control-plane-cutover` by cutting `@logixjs/cli` to the Agent First runtime control-plane route with only `check / trial / compare`.

**Architecture:** The CLI becomes a thin command router over `@logixjs/core` verification control-plane authority. Parser and loader accept `Program` entry plus canonical evidence and hint-only selection manifests, command runners return transport-only `CommandResult`, and every machine conclusion points to `VerificationControlPlaneReport` artifacts. Old IR, contract-suite, transform, describe, writeback, and devserver command identities are deleted or folded into private helpers used only by the three public commands.

**Tech Stack:** TypeScript, Effect V4, Node ESM, Vitest, `@logixjs/core/Runtime`, `@logixjs/core/ControlPlane`, package-local static schema artifacts.

---

## Execution Status

主干已实现：public command surface 收敛到 `check / trial / compare`，Program entry、canonical evidence、selection manifest、CommandResult transport、core-owned compare authority、schema artifact、旧命令删除和 playground 教程均已落地。

`trial --mode scenario` 当前后置。core 尚无 scenario executor 作为 CLI 成功路径 authority，因此 CLI 返回结构化失败，不把 startup trial 伪装成 scenario trial。后续若要开启 scenario 成功路径，先更新 `15-cli-agent-first-control-plane.md` 与本 spec，再补 core executor 和证明包。

## Authority

- Owner Spec: [160 CLI Agent First Control Plane Cutover](./spec.md)
- CLI SSoT: [15 CLI Agent First Control Plane](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- Verification control plane SSoT: [09 Verification Control Plane](../../docs/ssot/runtime/09-verification-control-plane.md)
- Runtime control plane SSoT: [04 Capabilities And Runtime Control Plane](../../docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- Public API spine: [01 Public API Spine](../../docs/ssot/runtime/01-public-api-spine.md)
- Canonical authoring: [03 Canonical Authoring](../../docs/ssot/runtime/03-canonical-authoring.md)
- DVTools export loop: [14 DVTools Internal Workbench](../../docs/ssot/runtime/14-dvtools-internal-workbench.md)
- Optimality ledger: [CLI Agent First Control Plane Review Ledger](../../docs/review-plan/runs/2026-04-26-cli-agent-first-control-plane-optimality-loop.md)

Implementation must follow these fixed decisions:

- Public binary survives only under the CLI existence gate.
- Public commands are exactly `check`, `trial`, and `compare`.
- Entry authority is `Program`; Module and Logic entries are rejected.
- Canonical evidence package is input/provenance only.
- Selection manifest is a hint-only sidecar.
- `CommandResult` is stdout transport only.
- `VerificationControlPlaneReport` is the only machine report authority.
- `primaryReportOutputKey` and `inputCoordinate` are mandatory in every `CommandResult`.
- Artifact links use only `artifacts[].outputKey`.
- Top-level `nextRecommendedStage` is Agent scheduling authority.
- `compare` cannot close until `@logixjs/core/ControlPlane` exposes a core-owned compare executor that owns compare truth.
- No transition layer, deprecation shell, public expert route, or old command alias is allowed.

## File Structure

Create parser, loading, input, and schema helpers:

- Create: `packages/logix-cli/src/internal/inputCoordinate.ts`
  - Owns serializable `CommandInputCoordinate`, rerun locator construction, and stage upgrade inheritance helpers.
- Create: `packages/logix-cli/src/internal/programEntry.ts`
  - Loads `<modulePath>#<exportName>`, validates the export is a `Program`, and rejects Module/Logic/unknown exports with structured CLI errors.
- Create: `packages/logix-cli/src/internal/evidenceInput.ts`
  - Reads canonical evidence package refs and selection manifest refs as locators/provenance. It validates shape, records refs, and does not interpret evidence truth.
- Create: `packages/logix-cli/src/internal/commandSchema.ts`
  - Owns derived static command schema data for offline Agent discovery.
- Create: `packages/logix-cli/src/schema/commands.v1.json`
  - Derived mirror of SSoT/core contracts for `check / trial / compare` only.

Create core compare authority:

- Modify: `packages/logix-core/src/ControlPlane.ts`
  - Export the compare input type and compare executor from the public `@logixjs/core/ControlPlane` subpath.
- Create if needed: `packages/logix-core/src/internal/verification/controlPlaneCompare.ts`
  - Owns compare verdict, environment mismatch logic, and report creation. CLI must not import this internal path.
- Create: `packages/logix-core/test/Contracts/VerificationControlPlaneCompare.contract.test.ts`
  - Proves the public `ControlPlane` compare executor owns compare semantics.

Rewrite existing CLI core:

- Modify: `packages/logix-cli/package.json`
  - Keep only bin `logix`, keep root TS exports closed, remove any `logix-devserver` publication path if present.
- Modify: `packages/logix-cli/src/index.ts`
  - Keep root empty.
- Modify: `packages/logix-cli/src/Commands.ts`
  - Either delete the re-export file if no package entry uses it, or reduce it to repo-internal test import without exposing archived commands.
- Modify: `packages/logix-cli/src/bin/logix.ts`
  - Print only deterministic `CommandResult` or help. Fallback errors must include `inputCoordinate`.
- Modify: `packages/logix-cli/src/internal/args.ts`
  - Replace old toolbox grammar with `check / trial / compare` grammar.
- Modify: `packages/logix-cli/src/internal/entry.ts`
  - Remove internal command dispatch for `describe`, `ir.*`, `contract-suite.run`, and `transform.module`.
- Modify: `packages/logix-cli/src/internal/result.ts`
  - Remove `mode`; add `inputCoordinate` and `primaryReportOutputKey`; enforce report artifact pointer checks.
- Modify: `packages/logix-cli/src/internal/artifacts.ts`
  - Keep deterministic artifact writing and ensure report artifact output keys are stable and unique.
- Modify: `packages/logix-cli/src/internal/errors.ts`
  - Add structured codes for non-Program entry, forbidden archived command, invalid evidence, invalid selection, and compare authority missing.
- Modify: `packages/logix-cli/src/internal/cliConfig.ts`
  - Keep config visibility only for public route defaults and remove writeback/toolbox-only defaults.

Rewrite public commands:

- Modify: `packages/logix-cli/src/internal/commands/check.ts`
  - Route directly to `Runtime.check(program, options)`.
- Modify: `packages/logix-cli/src/internal/commands/trial.ts`
  - Route directly to `Runtime.trial(program, options)` for `startup` and explicit `scenario`.
- Modify: `packages/logix-cli/src/internal/commands/compare.ts`
  - Route only to core-owned compare authority. If missing, fail the chunk and add the core authority first.
- Keep: `packages/logix-cli/src/internal/commands/unsupported.ts`
  - Unknown or archived command structured error only.

Delete old command identities:

- Delete: `packages/logix-cli/src/internal/commands/describe.ts`
- Delete: `packages/logix-cli/src/internal/commands/irExport.ts`
- Delete: `packages/logix-cli/src/internal/commands/irValidate.ts`
- Delete: `packages/logix-cli/src/internal/commands/irDiff.ts`
- Delete: `packages/logix-cli/src/internal/commands/contractSuiteRun.ts`
- Delete: `packages/logix-cli/src/internal/commands/transformModule.ts`
- Delete: `packages/logix-cli/src/bin/logix-devserver.ts`

If code from an old `ir*` file is still useful, move it into a new final-behavior helper before deletion. Allowed helper names must describe the public route or artifact role, for example `staticCheckArtifact.ts` or `controlPlaneReportReader.ts`; names containing `irExport`, `irValidate`, `irDiff`, or `runIr` are not allowed.

Create and replace tests:

- Create: `packages/logix-cli/test/Integration/public-surface.guard.test.ts`
- Create: `packages/logix-cli/test/Integration/archived-command-deletion.guard.test.ts`
- Create: `packages/logix-cli/test/Integration/program-entry.contract.test.ts`
- Create: `packages/logix-cli/test/Integration/evidence-selection-input.contract.test.ts`
- Create: `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- Create: `packages/logix-cli/test/Integration/artifact-key-namespace.contract.test.ts`
- Create: `packages/logix-cli/test/Integration/next-stage-precedence.contract.test.ts`
- Create: `packages/logix-cli/test/Integration/compare-authority.contract.test.ts`
- Create: `packages/logix-cli/test/Integration/agent-rerun-coordinate.golden.test.ts`
- Create: `packages/logix-cli/test/fixtures/BasicProgram.ts`
- Create: `packages/logix-cli/test/fixtures/BasicModuleOnly.ts`
- Create: `packages/logix-cli/test/fixtures/selection-manifest.json`
- Create: `packages/logix-cli/test/fixtures/evidence-package/manifest.json`
- Replace or delete: `packages/logix-cli/test/Integration/cli.describe-json.test.ts`
- Replace or delete: `packages/logix-cli/test/Integration/cli.ir-diff.fields.test.ts`
- Replace or delete: `packages/logix-cli/test/Integration/cli.ir-validate.fields.test.ts`
- Replace old assertions in:
  - `packages/logix-cli/test/Integration/check.command.test.ts`
  - `packages/logix-cli/test/Integration/trial.command.test.ts`
  - `packages/logix-cli/test/Integration/compare.command.test.ts`
  - `packages/logix-cli/test/Integration/output-contract.test.ts`
  - `packages/logix-cli/test/Args/Args.cli-config-prefix.test.ts`

Update docs and examples:

- Modify: `specs/160-cli-agent-first-control-plane-cutover/spec.md`
- Modify: `docs/ssot/runtime/15-cli-agent-first-control-plane.md` only if implementation proves a stronger terminal decision.
- Modify: `docs/ssot/runtime/README.md`
- Modify: `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/ssot/runtime/14-dvtools-internal-workbench.md`
- Modify: `examples/logix-cli-playground/tutorials/05-baseline-and-diff/README.md`
- Keep first-screen superseded banners under `specs/085-logix-cli-node-only/**/*.md`.

## Chunk 1: Public Surface Guards

Goal: lock the terminal public surface before rewriting parser and runners.

### Task 1.1: Guard package and binary surface

**Files:**

- Create: `packages/logix-cli/test/Integration/public-surface.guard.test.ts`
- Read: `packages/logix-cli/package.json`
- Read: `packages/logix-cli/src/index.ts`
- Read: `packages/logix-cli/src/internal/entry.ts`

- [ ] **Step 1: Write the failing or locking test**

```ts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { printHelp } from '../../src/internal/entry.js'

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const readText = (relativePath: string): string => fs.readFileSync(path.join(packageRoot, relativePath), 'utf8')
const readPackageJson = (): any => JSON.parse(readText('package.json'))

describe('@logixjs/cli public surface', () => {
  it('keeps the package root closed and exposes only the logix binary', () => {
    const pkg = readPackageJson()

    expect(Object.keys(pkg.bin ?? {})).toEqual(['logix'])
    expect(pkg.exports).toEqual({
      './package.json': './package.json',
      './internal/*': null,
    })
    expect(pkg.publishConfig.exports).toEqual({
      './package.json': './package.json',
      './internal/*': null,
    })
    expect(readText('src/index.ts').trim()).toBe('export {}')
  })

  it('prints only check, trial, and compare in public help', () => {
    const help = printHelp()

    expect(help).toContain('logix check')
    expect(help).toContain('logix trial')
    expect(help).toContain('logix compare')
    expect(help).not.toMatch(/describe|--describe-json|ir export|ir validate|ir diff|contract-suite|transform module|trialrun|devserver/)
    expect(help).not.toMatch(/--mode report|--mode write|--ops/)
  })
})
```

- [ ] **Step 2: Run the guard**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/public-surface.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL until any lingering help text, bin metadata, or package export residue is removed.

- [ ] **Step 3: Implement the minimal package/help cleanup**

Edit:

- `packages/logix-cli/package.json`
- `packages/logix-cli/src/index.ts`
- `packages/logix-cli/src/internal/entry.ts`

Rules:

- Help text shows `check`, `trial --mode startup`, and `compare` only.
- No internal help path lists archived commands.
- The package exposes no TS API.

- [ ] **Step 4: Run the guard again**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/public-surface.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

### Task 1.2: Guard archived command deletion

**Files:**

- Create: `packages/logix-cli/test/Integration/archived-command-deletion.guard.test.ts`
- Read: `packages/logix-cli/src/internal/args.ts`
- Read: `packages/logix-cli/src/internal/entry.ts`
- Read: `packages/logix-cli/src/internal/commands/**`

- [ ] **Step 1: Write the source and runtime guard**

```ts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/internal/entry.js'

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))

const readAllSrc = (dir: string): string => {
  const abs = path.join(packageRoot, dir)
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(dir, entry.name)
    if (entry.isDirectory()) return [readAllSrc(next)]
    if (!entry.name.endsWith('.ts')) return []
    return [fs.readFileSync(path.join(packageRoot, next), 'utf8')]
  }).join('\n')
}

describe('archived CLI command deletion', () => {
  it('rejects every archived command as invalid command input', async () => {
    const commands: ReadonlyArray<ReadonlyArray<string>> = [
      ['describe', '--runId', 'archived'],
      ['describe', '--runId', 'archived', '--json'],
      ['ir', 'export', '--runId', 'archived'],
      ['ir', 'validate', '--runId', 'archived'],
      ['ir', 'diff', '--runId', 'archived'],
      ['contract-suite', 'run', '--runId', 'archived'],
      ['transform', 'module', '--runId', 'archived'],
      ['trialrun', '--runId', 'archived'],
    ]

    for (const argv of commands) {
      const out = await Effect.runPromise(runCli(argv))
      expect(out.kind).toBe('result')
      if (out.kind !== 'result') throw new Error('expected result')
      expect(out.exitCode).toBe(2)
      expect(out.result.ok).toBe(false)
      expect(out.result.error?.code).toBe('CLI_INVALID_COMMAND')
    }
  })

  it('has no archived command identity in parser, entry, or command files', () => {
    const source = readAllSrc('src')

    expect(fs.existsSync(path.join(packageRoot, 'src/internal/commands/describe.ts'))).toBe(false)
    expect(fs.existsSync(path.join(packageRoot, 'src/internal/commands/contractSuiteRun.ts'))).toBe(false)
    expect(fs.existsSync(path.join(packageRoot, 'src/internal/commands/transformModule.ts'))).toBe(false)
    expect(fs.existsSync(path.join(packageRoot, 'src/bin/logix-devserver.ts'))).toBe(false)
    expect(source).not.toMatch(/CliDescribeReport|--describe-json|CommandResult\.mode/)
    expect(source).not.toMatch(/contract-suite\.run|transform\.module|ir\.export|ir\.validate|ir\.diff/)
    expect(source).not.toMatch(/runDescribe|runContractSuiteRun|runTransformModule/)
    expect(source).not.toMatch(/logix-devserver/)
  })
})
```

- [ ] **Step 2: Run and confirm current failure**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/archived-command-deletion.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL while archived routes and command files still exist.

- [ ] **Step 3: Keep this guard failing until Chunk 5**

Do not loosen the source patterns. If a helper is still needed, rename it around final behavior, for example `staticCheckArtifactHelper`, not `irValidate`.

## Chunk 2: Parser And Input Authority

Goal: replace old toolbox argv grammar with Program, evidence, selection, and stage input grammar.

### Task 2.1: Add Program fixtures and Program entry loader

**Files:**

- Create: `packages/logix-cli/test/fixtures/BasicProgram.ts`
- Create: `packages/logix-cli/test/fixtures/BasicModuleOnly.ts`
- Create: `packages/logix-cli/src/internal/programEntry.ts`
- Create: `packages/logix-cli/test/Integration/program-entry.contract.test.ts`

- [ ] **Step 1: Write the Program fixture**

```ts
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const State = Schema.Struct({
  count: Schema.Number,
})

const Actions = {
  noop: Schema.Void,
}

export const BasicModule = Logix.Module.make('CliBasicProgram', {
  state: State,
  actions: Actions,
  reducers: { noop: (s: { readonly count: number }) => s },
})

const BasicLogic = BasicModule.logic('noop', () => Effect.void)

export const BasicProgram = Logix.Program.make(BasicModule, {
  initial: { count: 0 },
  logics: [BasicLogic],
})

export const BasicLogicOnly = BasicLogic
```

Create `BasicModuleOnly.ts`:

```ts
export { BasicModule as ModuleOnly, BasicLogicOnly as LogicOnly } from './BasicProgram.js'
```

- [ ] **Step 2: Write the failing loader contract**

```ts
import path from 'node:path'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { loadProgramEntry } from '../../src/internal/programEntry.js'

const fixture = path.resolve(__dirname, '../fixtures/BasicProgram.ts')
const moduleOnlyFixture = path.resolve(__dirname, '../fixtures/BasicModuleOnly.ts')

describe('CLI Program entry authority', () => {
  it('loads a Program export', async () => {
    const program = await Effect.runPromise(loadProgramEntry({ modulePath: fixture, exportName: 'BasicProgram' }))
    expect((program as any)._kind).toBe('Program')
  })

  it('rejects Module and Logic exports', async () => {
    await expect(Effect.runPromise(loadProgramEntry({ modulePath: moduleOnlyFixture, exportName: 'ModuleOnly' }))).rejects.toMatchObject({ code: 'CLI_ENTRY_NOT_PROGRAM' })
    await expect(Effect.runPromise(loadProgramEntry({ modulePath: moduleOnlyFixture, exportName: 'LogicOnly' }))).rejects.toMatchObject({ code: 'CLI_ENTRY_NOT_PROGRAM' })
  })
})
```

- [ ] **Step 3: Run and confirm failure**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/program-entry.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL because `programEntry.ts` does not exist.

- [ ] **Step 4: Implement `programEntry.ts`**

Minimum implementation shape:

```ts
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Effect } from 'effect'
import { tsImport } from 'tsx/esm/api'

import { makeCliError } from './errors.js'

export interface ProgramEntryRef {
  readonly modulePath: string
  readonly exportName: string
}

const isProgram = (value: unknown): boolean =>
  Boolean(value && typeof value === 'object' && (value as any)._kind === 'Program')

export const loadProgramEntry = (entry: ProgramEntryRef): Effect.Effect<unknown, ReturnType<typeof makeCliError>> =>
  Effect.tryPromise({
    try: async () => {
      const fileUrl = pathToFileURL(path.resolve(entry.modulePath)).href
      const mod = entry.modulePath.endsWith('.ts') || entry.modulePath.endsWith('.tsx')
        ? await tsImport(fileUrl, import.meta.url)
        : await import(fileUrl)
      if (!(entry.exportName in mod)) {
        throw makeCliError({
          code: 'CLI_ENTRY_NO_EXPORT',
          message: `[Logix][CLI] entry export not found: ${entry.exportName}`,
        })
      }
      const value = mod[entry.exportName]
      if (!isProgram(value)) {
        throw makeCliError({
          code: 'CLI_ENTRY_NOT_PROGRAM',
          message: `[Logix][CLI] entry must export Program: ${entry.modulePath}#${entry.exportName}`,
        })
      }
      return value
    },
    catch: (cause) =>
      cause instanceof Error && 'code' in cause
        ? (cause as ReturnType<typeof makeCliError>)
        : makeCliError({
            code: 'CLI_ENTRY_IMPORT_FAILED',
            message: `[Logix][CLI] failed to import Program entry: ${entry.modulePath}#${entry.exportName}`,
            cause,
          }),
  })
```

Program loader rules:

- `.ts` and `.tsx` entry files are loaded with `tsx/esm/api` `tsImport`.
- `.js` and `.mjs` entry files use native dynamic import.
- Built CLI behavior must be tested outside Vitest's transform environment.
- `tsx` remains a runtime dependency while public CLI accepts TypeScript Program entries.

- [ ] **Step 5: Run the loader contract**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/program-entry.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

### Task 2.2: Add built CLI entry loading smoke

**Files:**

- Create: `packages/logix-cli/test/Integration/binary-program-entry.smoke.test.ts`
- Modify: `packages/logix-cli/src/internal/programEntry.ts`
- Read: `packages/logix-cli/package.json`

- [ ] **Step 1: Write the built binary smoke test**

```ts
import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

describe('built logix binary Program entry loading', () => {
  it('loads a .ts Program entry outside the Vitest transform environment', async () => {
    await execFileAsync('pnpm', ['-C', 'packages/logix-cli', 'build'], {
      cwd: path.resolve(__dirname, '../../../..'),
    })

    const entry = `${path.resolve(__dirname, '../fixtures/BasicProgram.ts')}#BasicProgram`
    const { stdout } = await execFileAsync(
      'node',
      [path.resolve(__dirname, '../../dist/bin/logix.js'), 'check', '--runId', 'binary-entry-1', '--entry', entry],
      { cwd: path.resolve(__dirname, '../../../..') },
    )

    const result = JSON.parse(stdout)
    expect(result.kind).toBe('CommandResult')
    expect(result.command).toBe('check')
    expect(result.primaryReportOutputKey).toBe('checkReport')
    expect(result.error?.code).not.toBe('CLI_ENTRY_IMPORT_FAILED')
  })
})
```

- [ ] **Step 2: Run and confirm failure before loader strategy exists**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/binary-program-entry.smoke.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL if the loader uses plain dynamic import for `.ts`.

- [ ] **Step 3: Keep this test in the final proof set**

This test is intentionally slower than parser/unit tests because it catches the actual published binary loading path.

### Task 2.3: Rewrite parser around final input grammar

**Files:**

- Modify: `packages/logix-cli/src/internal/args.ts`
- Modify: `packages/logix-cli/src/internal/cliConfig.ts`
- Modify: `packages/logix-cli/test/Args/Args.cli-config-prefix.test.ts`
- Create: `packages/logix-cli/test/Integration/evidence-selection-input.contract.test.ts`

- [ ] **Step 1: Write parser contract tests**

```ts
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { parseCliInvocation } from '../../src/internal/args.js'

describe('CLI final input grammar', () => {
  it('parses check with Program entry plus optional evidence and selection refs', async () => {
    const inv = await Effect.runPromise(parseCliInvocation([
      'check',
      '--runId',
      'parse-check',
      '--entry',
      './program.ts#BasicProgram',
      '--evidence',
      './evidence-package',
      '--selection',
      './selection.json',
    ]))

    expect(inv.kind).toBe('command')
    if (inv.kind !== 'command') throw new Error('expected command')
    expect(inv.command).toBe('check')
    expect(inv.entry).toEqual({ modulePath: './program.ts', exportName: 'BasicProgram' })
    expect(inv.evidence).toEqual({ ref: './evidence-package' })
    expect(inv.selection).toEqual({ ref: './selection.json' })
  })

  it('accepts trial mode startup and scenario only', async () => {
    const startup = await Effect.runPromise(parseCliInvocation(['trial', '--runId', 't1', '--entry', './program.ts#BasicProgram', '--mode', 'startup']))
    expect(startup.kind).toBe('command')
    if (startup.kind !== 'command') throw new Error('expected command')
    expect(startup.command).toBe('trial')
    expect(startup.trialMode).toBe('startup')

    await expect(Effect.runPromise(parseCliInvocation(['trial', '--runId', 't2', '--entry', './program.ts#BasicProgram', '--mode', 'report']))).rejects.toMatchObject({ code: 'CLI_INVALID_ARGUMENT' })
    await expect(Effect.runPromise(parseCliInvocation(['trial', '--runId', 't3', '--entry', './program.ts#BasicProgram', '--mode', 'write']))).rejects.toMatchObject({ code: 'CLI_INVALID_ARGUMENT' })
  })

  it('rejects toolbox-only options', async () => {
    await expect(Effect.runPromise(parseCliInvocation(['check', '--runId', 'bad', '--in', './legacy']))).rejects.toMatchObject({ code: 'CLI_INVALID_ARGUMENT' })
    await expect(Effect.runPromise(parseCliInvocation(['check', '--runId', 'bad', '--artifact', './legacy.json']))).rejects.toMatchObject({ code: 'CLI_INVALID_ARGUMENT' })
    await expect(Effect.runPromise(parseCliInvocation(['trial', '--runId', 'bad', '--entry', './program.ts#BasicProgram', '--ops', './delta.json']))).rejects.toMatchObject({ code: 'CLI_INVALID_ARGUMENT' })
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/evidence-selection-input.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL while `args.ts` still accepts legacy grammar.

- [ ] **Step 3: Replace command types in `args.ts`**

Final command union:

```ts
export type CliCommand = 'check' | 'trial' | 'compare'
export type TrialMode = 'startup' | 'scenario'

export type EvidenceInputRef = { readonly ref: string }
export type SelectionManifestRef = { readonly ref: string }
export type ScenarioInputRef = { readonly ref: string }

export type CompareInputRef = {
  readonly beforeReport: string
  readonly afterReport: string
  readonly beforeEvidence?: string
  readonly afterEvidence?: string
}
```

Final invocation shapes must contain:

- `check`: `entry`, optional `evidence`, optional `selection`
- `trial`: `entry`, `trialMode`, optional `evidence`, optional `selection`; `scenario` remains reserved and structured-failure only until core executor lands
- `compare`: `beforeReport`, `afterReport`, optional evidence refs, optional entry for declaration-coordinate resolution

Remove:

- `CliMode`
- `IrValidateInput`
- `--in`
- `--artifact`
- `--ops`
- global `--mode report|write`
- command tokens for `describe`, `ir.*`, `contract-suite`, `transform`

- [ ] **Step 4: Rewrite config prefix normalization**

Edit `packages/logix-cli/src/internal/cliConfig.ts`.

Keep only:

- `runId`
- `out`
- `outRoot`
- `budgetBytes`
- `host`
- `cliConfig`
- `profile`
- `entry`
- `evidence`
- `selection`
- `scenario`
- `beforeReport`
- `afterReport`
- `beforeEvidence`
- `afterEvidence`
- `config`
- diagnostics and timeout fields that `Runtime.trial` consumes

Remove defaults for:

- `mode=report|write`
- `ops`
- `baseline`
- `contract-suite`
- transform/writeback fields
- IR-only input aliases

- [ ] **Step 5: Run parser and config tests**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/evidence-selection-input.contract.test.ts test/Args/Args.cli-config-prefix.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS after test updates.

### Task 2.4: Read evidence and selection as non-authoritative inputs

**Files:**

- Create: `packages/logix-cli/src/internal/evidenceInput.ts`
- Create: `packages/logix-cli/test/fixtures/evidence-package/manifest.json`
- Create: `packages/logix-cli/test/fixtures/selection-manifest.json`
- Modify: `packages/logix-cli/test/Integration/evidence-selection-input.contract.test.ts`

- [ ] **Step 1: Create minimal fixtures**

`packages/logix-cli/test/fixtures/evidence-package/manifest.json`:

```json
{
  "schemaVersion": 1,
  "kind": "CanonicalEvidencePackage",
  "packageId": "fixture:evidence:cli-basic",
  "artifacts": [
    {
      "outputKey": "dvtools-session-snapshot",
      "kind": "DVToolsSessionSnapshot",
      "ref": "./session.json"
    }
  ]
}
```

`packages/logix-cli/test/fixtures/selection-manifest.json`:

```json
{
  "schemaVersion": 1,
  "kind": "LogixSelectionManifest",
  "selectionId": "fixture:selection:cli-basic",
  "sessionId": "session:1",
  "findingId": "finding:1",
  "artifactOutputKey": "dvtools-session-snapshot",
  "focusRef": {
    "sourceRef": "src/basic.ts:1"
  }
}
```

- [ ] **Step 2: Write the evidence/selection contract**

```ts
import path from 'node:path'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { readEvidenceInputs } from '../../src/internal/evidenceInput.js'

describe('CLI evidence and selection input handling', () => {
  it('reads canonical evidence package as provenance and selection manifest as hint only', async () => {
    const evidenceRef = path.resolve(__dirname, '../fixtures/evidence-package')
    const selectionRef = path.resolve(__dirname, '../fixtures/selection-manifest.json')

    const input = await Effect.runPromise(readEvidenceInputs({
      evidence: { ref: evidenceRef },
      selection: { ref: selectionRef },
    }))

    expect(input.evidence).toEqual({
      ref: evidenceRef,
      kind: 'CanonicalEvidencePackage',
      packageId: 'fixture:evidence:cli-basic',
      artifactOutputKeys: ['dvtools-session-snapshot'],
    })
    expect(input.selection).toEqual({
      ref: selectionRef,
      kind: 'LogixSelectionManifest',
      selectionId: 'fixture:selection:cli-basic',
      sessionId: 'session:1',
      findingId: 'finding:1',
      artifactOutputKey: 'dvtools-session-snapshot',
      focusRef: { sourceRef: 'src/basic.ts:1' },
      authority: 'hint-only',
    })
    expect(input).not.toHaveProperty('sessionTruth')
    expect(input).not.toHaveProperty('findingTruth')
    expect(input).not.toHaveProperty('reportTruth')
  })
})
```

- [ ] **Step 3: Run and confirm failure**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/evidence-selection-input.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL until `evidenceInput.ts` exists.

- [ ] **Step 4: Implement `evidenceInput.ts`**

Rules:

- Evidence package reader accepts a directory with `manifest.json` or a direct manifest file.
- It validates `kind="CanonicalEvidencePackage"` and records `packageId`, `ref`, and artifact output keys.
- Selection manifest reader validates `kind="LogixSelectionManifest"` and records only locator/hint fields.
- Selection output must include `authority: 'hint-only'`.
- It must not copy DVTools session truth, finding truth, report truth, raw trace payloads, or evidence payloads into CLI-owned structures.
- Invalid evidence returns `CLI_INVALID_EVIDENCE`.
- Invalid selection returns `CLI_INVALID_SELECTION`.

- [ ] **Step 5: Run evidence/selection contract**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/evidence-selection-input.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

## Chunk 3: CommandResult Transport Contract

Goal: make stdout envelope deterministic transport with mandatory report artifact pointer and rerun coordinates.

### Task 3.1: Add input coordinate model

**Files:**

- Create: `packages/logix-cli/src/internal/inputCoordinate.ts`
- Modify: `packages/logix-cli/src/internal/result.ts`
- Create: `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- Create: `packages/logix-cli/test/Integration/artifact-key-namespace.contract.test.ts`
- Create: `packages/logix-cli/test/Integration/next-stage-precedence.contract.test.ts`

- [ ] **Step 1: Write transport contract tests**

```ts
import { describe, expect, it } from 'vitest'
import { isVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

import { makeCommandResult } from '../../src/internal/result.js'

const report = {
  schemaVersion: 1,
  kind: 'VerificationControlPlaneReport',
  stage: 'check',
  mode: 'static',
  verdict: 'PASS',
  errorCode: null,
  summary: 'ok',
  environment: {},
  artifacts: [{ outputKey: 'checkReport', kind: 'VerificationControlPlaneReport' }],
  repairHints: [],
  nextRecommendedStage: 'trial',
} as const

describe('CommandResult transport contract', () => {
  it('requires inputCoordinate and primaryReportOutputKey', () => {
    const result = makeCommandResult({
      runId: 'r1',
      command: 'check',
      ok: true,
      inputCoordinate: {
        command: 'check',
        entry: { modulePath: './program.ts', exportName: 'BasicProgram' },
      },
      primaryReportOutputKey: 'checkReport',
      artifacts: [{ outputKey: 'checkReport', kind: 'VerificationControlPlaneReport', ok: true, inline: report }],
    })

    expect(result).not.toHaveProperty('mode')
    expect(result.inputCoordinate.command).toBe('check')
    expect(result.primaryReportOutputKey).toBe('checkReport')
    expect(isVerificationControlPlaneReport(result.artifacts[0]?.inline)).toBe(true)
  })

  it('rejects a primary report key missing from artifacts', () => {
    expect(() =>
      makeCommandResult({
        runId: 'r2',
        command: 'check',
        ok: true,
        inputCoordinate: { command: 'check' },
        primaryReportOutputKey: 'missing',
        artifacts: [{ outputKey: 'other', kind: 'VerificationControlPlaneReport', ok: true, inline: report }],
      }),
    ).toThrow(/primaryReportOutputKey/)
  })
})
```

- [ ] **Step 2: Write artifact namespace test**

```ts
import { describe, expect, it } from 'vitest'

import { assertArtifactLinks } from '../../src/internal/result.js'

describe('CLI artifact key namespace', () => {
  it('requires repair hints to link artifacts by artifacts[].outputKey only', () => {
    const artifacts = [{ outputKey: 'checkReport', kind: 'VerificationControlPlaneReport', ok: true }] as const
    expect(() => assertArtifactLinks(artifacts, ['checkReport'])).not.toThrow()
    expect(() => assertArtifactLinks(artifacts, ['artifact://checkReport'])).toThrow(/outputKey/)
  })
})
```

- [ ] **Step 3: Write next-stage precedence test**

```ts
import { describe, expect, it } from 'vitest'

import { getAgentSchedulingStage } from '../../src/internal/result.js'

describe('nextRecommendedStage precedence', () => {
  it('uses top-level nextRecommendedStage over hint-local upgrades', () => {
    expect(getAgentSchedulingStage({
      nextRecommendedStage: 'trial',
      repairHints: [
        { code: 'x', canAutoRetry: false, upgradeToStage: 'compare', focusRef: null },
      ],
    })).toBe('trial')
  })
})
```

- [ ] **Step 4: Run and confirm failure**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/command-result-transport.contract.test.ts test/Integration/artifact-key-namespace.contract.test.ts test/Integration/next-stage-precedence.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL while `CommandResult.mode` exists and new helpers are missing.

- [ ] **Step 5: Implement `inputCoordinate.ts` and update `result.ts`**

`CommandResult` must have:

```ts
export interface CommandResult {
  readonly schemaVersion: 1
  readonly kind: 'CommandResult'
  readonly runId: string
  readonly command: 'check' | 'trial' | 'compare' | 'unknown'
  readonly ok: boolean
  readonly inputCoordinate: CommandInputCoordinate
  readonly artifacts: ReadonlyArray<ArtifactOutput>
  readonly primaryReportOutputKey: string
  readonly error?: SerializableErrorSummary
}
```

Rules:

- Remove `mode` from all types and builders.
- `makeCommandResult` throws if `primaryReportOutputKey` is absent from `artifacts[].outputKey`.
- The artifact pointed to by `primaryReportOutputKey` must be kind `VerificationControlPlaneReport`.
- Error results with no report must still include `inputCoordinate` and may use `primaryReportOutputKey: 'errorReport'` only when an error report artifact exists.
- `makeErrorCommandResult` must create a minimal `VerificationControlPlaneReport` artifact, then point `primaryReportOutputKey` at it.
- `toArtifactRefs` preserves `outputKey` and never emits `role`.

- [ ] **Step 6: Run transport contracts**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/command-result-transport.contract.test.ts test/Integration/artifact-key-namespace.contract.test.ts test/Integration/next-stage-precedence.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

## Chunk 4: Real Check And Trial Routes

Goal: connect `check` and `trial` to runtime control-plane routes and remove `CLI_NOT_IMPLEMENTED`.

### Task 4.1: Rewrite check to `Runtime.check`

**Files:**

- Modify: `packages/logix-cli/src/internal/commands/check.ts`
- Modify: `packages/logix-cli/test/Integration/check.command.test.ts`
- Modify: `packages/logix-cli/test/Integration/output-contract.test.ts`

- [ ] **Step 1: Write check route contract**

```ts
import path from 'node:path'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { isVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

import { runCli } from '../../src/internal/entry.js'

describe('logix check command', () => {
  it('routes a Program entry to Runtime.check', async () => {
    const entry = `${path.resolve(__dirname, '../fixtures/BasicProgram.ts')}#BasicProgram`
    const out = await Effect.runPromise(runCli(['check', '--runId', 'check-program-1', '--entry', entry]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(0)
    expect(out.result.command).toBe('check')
    expect(out.result.ok).toBe(true)
    expect(out.result.primaryReportOutputKey).toBe('checkReport')
    expect(out.result.inputCoordinate.entry).toEqual({
      modulePath: path.resolve(__dirname, '../fixtures/BasicProgram.ts'),
      exportName: 'BasicProgram',
    })

    const reportArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryReportOutputKey)
    expect(reportArtifact?.kind).toBe('VerificationControlPlaneReport')
    expect(isVerificationControlPlaneReport(reportArtifact?.inline)).toBe(true)
    expect((reportArtifact?.inline as any).stage).toBe('check')
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/check.command.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL while `check` still wraps `ir.validate`.

- [ ] **Step 3: Implement `runCheck`**

Implementation rules:

- Load Program through `loadProgramEntry`.
- Call `Runtime.check(program, { runId })`.
- Pass evidence and selection only as provenance or future control-plane options if a current typed option exists.
- Create `checkReport` artifact with kind `VerificationControlPlaneReport`.
- Use `makeCommandResult` with `inputCoordinate` and `primaryReportOutputKey: 'checkReport'`.
- Exit code remains derived by `entry.ts`: `0` for PASS, `2` for gate/user fail, `1` for internal fail.
- Do not call `irValidate`.

- [ ] **Step 4: Run check tests**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/check.command.test.ts test/Integration/output-contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS after updating output-contract expectations to `VerificationControlPlaneReport`.

### Task 4.2: Rewrite trial to `Runtime.trial`

**Files:**

- Modify: `packages/logix-cli/src/internal/commands/trial.ts`
- Modify: `packages/logix-cli/test/Integration/trial.command.test.ts`

- [ ] **Step 1: Write trial route contract**

```ts
import path from 'node:path'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { isVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

import { runCli } from '../../src/internal/entry.js'

describe('logix trial command', () => {
  it('routes startup mode to Runtime.trial', async () => {
    const entry = `${path.resolve(__dirname, '../fixtures/BasicProgram.ts')}#BasicProgram`
    const out = await Effect.runPromise(runCli(['trial', '--runId', 'trial-startup-1', '--entry', entry, '--mode', 'startup']))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.command).toBe('trial')
    expect(out.result.primaryReportOutputKey).toBe('trialReport')
    expect(out.result.error?.code).not.toBe('CLI_NOT_IMPLEMENTED')

    const reportArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryReportOutputKey)
    expect(reportArtifact?.kind).toBe('VerificationControlPlaneReport')
    expect(isVerificationControlPlaneReport(reportArtifact?.inline)).toBe(true)
    expect((reportArtifact?.inline as any).stage).toBe('trial')
    expect((reportArtifact?.inline as any).mode).toBe('startup')
  })

  it('requires scenario input for scenario mode', async () => {
    const entry = `${path.resolve(__dirname, '../fixtures/BasicProgram.ts')}#BasicProgram`
    const out = await Effect.runPromise(runCli(['trial', '--runId', 'trial-scenario-missing', '--entry', entry, '--mode', 'scenario']))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(2)
    expect(out.result.error?.code).toBe('CLI_SCENARIO_INPUT_REQUIRED')
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/trial.command.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL while `trial` returns `CLI_NOT_IMPLEMENTED`.

- [ ] **Step 3: Implement `runTrial`**

Implementation rules:

- Load Program through `loadProgramEntry`.
- `trial --mode startup` calls `Runtime.trial(program, { runId, buildEnv, diagnosticsLevel, maxEvents, timeoutMs })`.
- Default trial mode is `startup`.
- `trial --mode scenario` returns structured failure until a core-owned scenario executor exists.
- Supported Program startup input must never return `CLI_NOT_IMPLEMENTED`.
- Create `trialReport` artifact with kind `VerificationControlPlaneReport`.

- [ ] **Step 4: Run trial tests**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/trial.command.test.ts test/Integration/output-contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS for startup route. Scenario path may remain an explicit gate only if owner spec still allows scenario executor deferral.

## Chunk 5: Compare Authority And Archived Route Deletion

Goal: productize `compare` only after compare truth is owned by core, then delete old command identities.

### Task 5.1: Add compare authority precondition test

**Files:**

- Modify: `packages/logix-core/src/ControlPlane.ts`
- Create if needed: `packages/logix-core/src/internal/verification/controlPlaneCompare.ts`
- Create: `packages/logix-core/test/Contracts/VerificationControlPlaneCompare.contract.test.ts`
- Modify: `packages/logix-cli/src/internal/commands/compare.ts`
- Create: `packages/logix-cli/test/Integration/compare-authority.contract.test.ts`
- Modify: `packages/logix-cli/test/Integration/compare.command.test.ts`

- [ ] **Step 1: Write core compare authority contract**

```ts
import { describe, expect, it } from 'vitest'
import {
  compareVerificationControlPlaneReports,
  isVerificationControlPlaneReport,
} from '../../src/ControlPlane.js'

const makeReport = (runId: string, env: Record<string, unknown>) => ({
  schemaVersion: 1,
  kind: 'VerificationControlPlaneReport',
  stage: 'trial',
  mode: 'startup',
  verdict: 'PASS',
  errorCode: null,
  summary: 'ok',
  environment: { runId, ...env },
  artifacts: [],
  repairHints: [],
  nextRecommendedStage: null,
} as const)

describe('Verification control-plane compare authority', () => {
  it('is exported from the public ControlPlane subpath', () => {
    expect(typeof compareVerificationControlPlaneReports).toBe('function')
  })

  it('owns compare verdict and environment mismatch semantics', () => {
    const result = compareVerificationControlPlaneReports({
      runId: 'core-compare-1',
      before: makeReport('before', { host: 'node' }),
      after: makeReport('after', { host: 'browser' }),
    })

    expect(isVerificationControlPlaneReport(result)).toBe(true)
    expect(result.stage).toBe('compare')
    expect(result.mode).toBe('compare')
    expect(result.verdict).toBe('INCONCLUSIVE')
    expect(result.errorCode).toBe('COMPARE_ENVIRONMENT_MISMATCH')
  })
})
```

- [ ] **Step 2: Run and confirm core failure**

```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/VerificationControlPlaneCompare.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL until `@logixjs/core/ControlPlane` exports the compare executor.

- [ ] **Step 3: Implement core-owned compare first**

Acceptable implementation:

- Public export name: `compareVerificationControlPlaneReports`.
- Public import path for CLI: `@logixjs/core/ControlPlane`.
- Internal implementation may live under `packages/logix-core/src/internal/verification/controlPlaneCompare.ts`.
- CLI must not import `@logixjs/core/internal/*` or `@logixjs/core/repo-internal/*`.
- Input: before/after `VerificationControlPlaneReport`, optional evidence summaries, optional artifact refs.
- Output: `VerificationControlPlaneReport` with `stage="compare"` and `mode="compare"`.
- Environment mismatch returns `INCONCLUSIVE` with `COMPARE_ENVIRONMENT_MISMATCH`.
- Raw evidence full compare is not default.

If this cannot be implemented in core during this work item, stop `compare` implementation and mark `160` incomplete. Do not keep CLI-local `ir.diff` as compare truth.

- [ ] **Step 4: Run core compare contract**

```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/VerificationControlPlaneCompare.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

- [ ] **Step 5: Write CLI compare authority contract**

```ts
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { isVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

import { runCli } from '../../src/internal/entry.js'

const writeReport = async (dir: string, file: string, report: any): Promise<string> => {
  const out = path.join(dir, file)
  await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return out
}

const makeReport = (runId: string, env: Record<string, unknown>) => ({
  schemaVersion: 1,
  kind: 'VerificationControlPlaneReport',
  stage: 'trial',
  mode: 'startup',
  verdict: 'PASS',
  errorCode: null,
  summary: 'ok',
  environment: { runId, ...env },
  artifacts: [],
  repairHints: [],
  nextRecommendedStage: null,
})

describe('logix compare authority', () => {
  it('delegates compare truth to the public core ControlPlane export', async () => {
    const source = await fs.readFile(path.resolve(__dirname, '../../src/internal/commands/compare.ts'), 'utf8')

    expect(source).toMatch(/from '@logixjs\/core\/ControlPlane'/)
    expect(source).toContain('compareVerificationControlPlaneReports')
    expect(source).not.toContain('@logixjs/core/internal/')
    expect(source).not.toContain('@logixjs/core/repo-internal/')
    expect(source).not.toMatch(/irDiff|runIrDiff|classif|diffReason|reasonCodes\\.map|reasonCodes\\.flatMap/)
    expect(source).not.toMatch(/\\bmakeControlPlaneReport\\b|\\bverdict\\s*[:=]|\\berrorCode\\s*[:=]|nextRecommendedStage\\s*[:=]/)
    expect(source).not.toContain('COMPARE_ENVIRONMENT_MISMATCH')
  })

  it('compares before and after reports through control-plane authority', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-compare-authority-'))
    const before = await writeReport(dir, 'before.report.json', makeReport('before', { host: 'node' }))
    const after = await writeReport(dir, 'after.report.json', makeReport('after', { host: 'node' }))

    const out = await Effect.runPromise(runCli(['compare', '--runId', 'compare-authority-1', '--beforeReport', before, '--afterReport', after]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.result.primaryReportOutputKey).toBe('compareReport')
    const reportArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === 'compareReport')
    expect(reportArtifact?.kind).toBe('VerificationControlPlaneReport')
    expect(isVerificationControlPlaneReport(reportArtifact?.inline)).toBe(true)
    expect((reportArtifact?.inline as any).stage).toBe('compare')
  })

  it('returns INCONCLUSIVE on environment mismatch', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-compare-env-'))
    const before = await writeReport(dir, 'before.report.json', makeReport('before', { host: 'node' }))
    const after = await writeReport(dir, 'after.report.json', makeReport('after', { host: 'browser' }))

    const out = await Effect.runPromise(runCli(['compare', '--runId', 'compare-env-1', '--beforeReport', before, '--afterReport', after]))
    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    const report = out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryReportOutputKey)?.inline as any
    expect(report.verdict).toBe('INCONCLUSIVE')
    expect(report.errorCode).toBe('COMPARE_ENVIRONMENT_MISMATCH')
  })
})
```

- [ ] **Step 6: Run and confirm CLI failure**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/compare-authority.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL while `compare` wraps `ir.diff` or core compare authority is absent.

- [ ] **Step 7: Rewrite CLI compare**

Implementation rules:

- Parse `--beforeReport` and `--afterReport`.
- Validate both with `isVerificationControlPlaneReport`.
- Pass reports to `compareVerificationControlPlaneReports` imported from `@logixjs/core/ControlPlane`.
- Create `compareReport` artifact with kind `VerificationControlPlaneReport`.
- Populate `inputCoordinate.compare` with report and optional evidence refs.
- Do not call `irDiff`.
- Do not compute compare verdict, environment mismatch, diff classification, or `nextRecommendedStage` inside CLI.
- Do not call `makeControlPlaneReport` inside `compare.ts`; the report comes from core.

- [ ] **Step 8: Run compare tests**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/compare-authority.contract.test.ts test/Integration/compare.command.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS only when compare truth is core-owned.

### Task 5.2: Delete old command files and command identity

**Files:**

- Delete: `packages/logix-cli/src/internal/commands/describe.ts`
- Delete: `packages/logix-cli/src/internal/commands/irExport.ts`
- Delete: `packages/logix-cli/src/internal/commands/irValidate.ts`
- Delete: `packages/logix-cli/src/internal/commands/irDiff.ts`
- Delete: `packages/logix-cli/src/internal/commands/contractSuiteRun.ts`
- Delete: `packages/logix-cli/src/internal/commands/transformModule.ts`
- Delete: `packages/logix-cli/src/bin/logix-devserver.ts`
- Modify: `packages/logix-cli/src/internal/entry.ts`
- Modify: `packages/logix-cli/src/internal/args.ts`

- [ ] **Step 1: Remove command imports and dispatch**

Delete every dynamic import branch for:

- `describe`
- `ir.export`
- `ir.validate`
- `ir.diff`
- `contract-suite.run`
- `transform.module`

Public `runCli` and any repo-internal test import must dispatch only:

- `check`
- `trial`
- `compare`

- [ ] **Step 2: Delete old command files**

Remove the files listed above. If a piece of implementation is still needed, move it into a helper with final behavior naming before deleting the command file. No surviving file, type, function, import, or test helper may contain `irExport`, `irValidate`, `irDiff`, or `runIr`.

- [ ] **Step 3: Replace old tests**

Delete or rewrite old tests that assert archived public behavior:

- `packages/logix-cli/test/Integration/cli.describe-json.test.ts`
- `packages/logix-cli/test/Integration/cli.ir-diff.fields.test.ts`
- `packages/logix-cli/test/Integration/cli.ir-validate.fields.test.ts`

Do not leave skip markers. Replaced tests must assert deletion, command rejection, or final command behavior.

- [ ] **Step 4: Run archived command guard**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/archived-command-deletion.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

## Chunk 6: Agent Rerun, Schema Artifact, Docs Closure

Goal: close the Agent loop proof and ensure current docs teach only the final route.

### Task 6.1: Add Agent rerun golden test

**Files:**

- Create: `packages/logix-cli/test/Integration/agent-rerun-coordinate.golden.test.ts`
- Modify: `packages/logix-cli/src/internal/inputCoordinate.ts`
- Modify: `packages/logix-cli/src/internal/entry.ts`

- [ ] **Step 1: Write golden rerun test**

```ts
import path from 'node:path'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/internal/entry.js'
import { toRecommendedStageArgv, toSameStageArgv } from '../../src/internal/inputCoordinate.js'

describe('Agent rerun coordinate golden path', () => {
  it('reconstructs same-stage rerun and startup upgrade from check output', async () => {
    const programPath = path.resolve(__dirname, '../fixtures/BasicProgram.ts')
    const out = await Effect.runPromise(runCli(['check', '--runId', 'rerun-1', '--entry', `${programPath}#BasicProgram`]))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    expect(toSameStageArgv(out.result.inputCoordinate)).toEqual([
      'check',
      '--entry',
      `${programPath}#BasicProgram`,
    ])
    expect((out.result.artifacts.find((artifact) => artifact.outputKey === out.result.primaryReportOutputKey)?.inline as any).nextRecommendedStage).toBe('trial')
    const resultWithDecoyReport = {
      ...out.result,
      artifacts: [
        ...out.result.artifacts,
        {
          outputKey: 'decoyReport',
          kind: 'VerificationControlPlaneReport',
          ok: true,
          inline: {
            schemaVersion: 1,
            kind: 'VerificationControlPlaneReport',
            stage: 'check',
            mode: 'static',
            verdict: 'FAIL',
            errorCode: 'DECOY',
            summary: 'decoy',
            environment: {},
            artifacts: [],
            repairHints: [
              {
                code: 'DECOY_HINT',
                canAutoRetry: false,
                upgradeToStage: 'compare',
                focusRef: null,
              },
            ],
            nextRecommendedStage: 'compare',
          },
        },
      ],
    }
    expect(toRecommendedStageArgv(out.result)).toEqual([
      'trial',
      '--entry',
      `${programPath}#BasicProgram`,
      '--mode',
      'startup',
    ])
    expect(toRecommendedStageArgv(resultWithDecoyReport)).toEqual([
      'trial',
      '--entry',
      `${programPath}#BasicProgram`,
      '--mode',
      'startup',
    ])
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/agent-rerun-coordinate.golden.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL until `inputCoordinate` helpers exist and command results contain enough locator fields.

- [ ] **Step 3: Implement rerun helpers**

Rules:

- Same-stage rerun uses `CommandResult.inputCoordinate`.
- Upgrade uses the referenced `VerificationControlPlaneReport.nextRecommendedStage` plus inherited locator/ref values from `CommandResult.inputCoordinate`.
- `toRecommendedStageArgv(result)` must read the report artifact identified by `result.primaryReportOutputKey`; it must not accept a caller-supplied stage string.
- Non-primary reports and hint-local `upgradeToStage` conflicts must not influence scheduling.
- `trial` upgrade from `check` defaults to `--mode startup`.
- `compare` upgrade requires before/after report refs. If missing, helper returns structured error.
- Helpers never read evidence truth or report body.

- [ ] **Step 4: Run golden test**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/agent-rerun-coordinate.golden.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

### Task 6.2: Add derived schema artifact

**Files:**

- Create: `packages/logix-cli/src/internal/commandSchema.ts`
- Create: `packages/logix-cli/src/schema/commands.v1.json`
- Create: `packages/logix-cli/test/Integration/command-schema.guard.test.ts`

- [ ] **Step 1: Write schema guard**

```ts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const schema = JSON.parse(fs.readFileSync(path.join(packageRoot, 'src/schema/commands.v1.json'), 'utf8'))

describe('CLI derived command schema artifact', () => {
  it('contains only final public commands and no archived discovery route', () => {
    expect(schema.kind).toBe('LogixCliCommandSchema')
    expect(schema.authority).toContain('docs/ssot/runtime/15-cli-agent-first-control-plane.md')
    expect(schema.commands.map((command: any) => command.name)).toEqual(['check', 'trial', 'compare'])
    expect(JSON.stringify(schema)).not.toMatch(/describe|--describe-json|CliDescribeReport|contract-suite|transform|ir\.|trialrun|writeback/)
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/command-schema.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: FAIL until schema artifact exists.

- [ ] **Step 3: Create schema artifact**

Rules:

- Mark it as derived mirror.
- Link SSoT and core control-plane authority.
- Include command names, required inputs, optional inputs, forbidden inputs, output contract fields, and exit codes.
- Do not include archived command names in the schema artifact. Archived command rejection is covered by `archived-command-deletion.guard.test.ts`.
- Do not add executable discovery command.

- [ ] **Step 4: Run schema guard**

```bash
pnpm -C packages/logix-cli exec vitest run test/Integration/command-schema.guard.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Expected: PASS.

### Task 6.3: Update docs and examples

**Files:**

- Modify: `examples/logix-cli-playground/tutorials/05-baseline-and-diff/README.md`
- Modify: `docs/ssot/runtime/README.md`
- Modify: `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/ssot/runtime/14-dvtools-internal-workbench.md`
- Verify: `specs/085-logix-cli-node-only/**/*.md`

- [ ] **Step 1: Replace tutorial commands**

The tutorial must teach only:

```bash
pnpm -C examples/logix-cli-playground exec logix check --runId demo-check --entry src/entry.basic.ts#AppRoot
pnpm -C examples/logix-cli-playground exec logix trial --runId demo-trial --entry src/entry.basic.ts#AppRoot --mode startup
pnpm -C examples/logix-cli-playground exec logix compare --runId demo-compare --beforeReport ./before.report.json --afterReport ./after.report.json
```

Remove any instruction for:

- `ir export`
- `ir validate`
- `ir diff`
- `contract-suite`
- `transform module`
- `describe --json`
- `--mode report`
- `--mode write`
- `ControlSurfaceManifest`
- `controlProgramSurface`

- [ ] **Step 2: Verify SSoT cross references**

Current docs must link to `15-cli-agent-first-control-plane.md` from runtime README, runtime control plane, verification control plane, and DVTools SSoT.

- [ ] **Step 3: Verify old 085 banners**

```bash
find specs/085-logix-cli-node-only -name '*.md' -print0 | xargs -0 rg -L "Superseded background only|Current CLI authority"
```

Expected: no output.

- [ ] **Step 4: Run docs sweep**

```bash
rg -n "ir export|ir validate|ir diff|irExport|irValidate|irDiff|runIr|contract-suite|transform module|trialrun|describe --json|--describe-json|--mode report|--mode write|ControlSurfaceManifest|controlProgramSurface|CommandResult\\.mode|RuntimeCheckReport|RuntimeTrialReport|RuntimeCompareReport" \
  docs/ssot docs/standards examples/logix-cli-playground packages/logix-cli/src \
  --glob '!docs/archive/**' \
  --glob '!specs/085-logix-cli-node-only/**'
```

Expected: no public teaching or schema authority residue.

Run deletion-test-only sweep:

```bash
rg -n "ir export|ir validate|ir diff|irExport|irValidate|irDiff|runIr|contract-suite|transform module|trialrun|describe --json|--describe-json|--mode report|--mode write|ControlSurfaceManifest|controlProgramSurface|CommandResult\\.mode|RuntimeCheckReport|RuntimeTrialReport|RuntimeCompareReport" \
  packages/logix-cli/test \
  --glob '!docs/archive/**' \
  --glob '!specs/085-logix-cli-node-only/**'
```

Expected: matches are allowed only in tests that explicitly assert deletion or rejection, such as `archived-command-deletion.guard.test.ts`, `public-surface.guard.test.ts`, and schema absence tests.

## Final Verification

Run focused CLI checks:

```bash
pnpm -C packages/logix-cli exec vitest run \
  test/Integration/public-surface.guard.test.ts \
  test/Integration/archived-command-deletion.guard.test.ts \
  test/Integration/program-entry.contract.test.ts \
  test/Integration/binary-program-entry.smoke.test.ts \
  test/Integration/evidence-selection-input.contract.test.ts \
  test/Integration/command-result-transport.contract.test.ts \
  test/Integration/artifact-key-namespace.contract.test.ts \
  test/Integration/next-stage-precedence.contract.test.ts \
  test/Integration/check.command.test.ts \
  test/Integration/trial.command.test.ts \
  test/Integration/compare-authority.contract.test.ts \
  test/Integration/agent-rerun-coordinate.golden.test.ts \
  --silent=passed-only --reporter=dot --hideSkippedTests
```

Run package quality gates:

```bash
pnpm -C packages/logix-cli typecheck:test
pnpm -C packages/logix-cli test
pnpm -C packages/logix-cli typecheck
pnpm -C packages/logix-cli measure:startup
```

Run repository checks if the implementation touched core compare authority:

```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/VerificationControlPlaneCompare.contract.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
pnpm -C packages/logix-core typecheck
pnpm -C packages/logix-core test
pnpm typecheck
pnpm test:turbo
```

Run final source sweeps:

```bash
rg -n "describe|--describe-json|CliDescribeReport|contract-suite|transform\\.module|transform module|ir\\.export|ir\\.validate|ir\\.diff|irExport|irValidate|irDiff|runIr|trialrun|--mode report|--mode write|CommandResult\\.mode|ControlSurfaceManifest|controlProgramSurface|RuntimeCheckReport|RuntimeTrialReport|RuntimeCompareReport" \
  packages/logix-cli/src examples/logix-cli-playground docs/ssot docs/standards \
  --glob '!docs/archive/**' \
  --glob '!specs/085-logix-cli-node-only/**'
```

Expected: no implementation residue or current docs teaching residue.

Run test-only negative assertion sweep separately:

```bash
rg -n "describe|--describe-json|CliDescribeReport|contract-suite|transform\\.module|transform module|ir\\.export|ir\\.validate|ir\\.diff|irExport|irValidate|irDiff|runIr|trialrun|--mode report|--mode write|CommandResult\\.mode|ControlSurfaceManifest|controlProgramSurface|RuntimeCheckReport|RuntimeTrialReport|RuntimeCompareReport" \
  packages/logix-cli/test \
  --glob '!docs/archive/**' \
  --glob '!specs/085-logix-cli-node-only/**'
```

Expected: matches appear only in deletion, rejection, and absence tests.

## Done Gates

`160` implementation closes only when:

- `@logixjs/cli` public command surface is exactly `check / trial / compare`.
- Package root exports no TS API.
- Parser rejects archived commands and old toolbox options.
- Parser accepts Program entry, evidence ref, selection ref, startup trial mode, and compare report refs per stage matrix.
- CLI rejects Module and Logic entries.
- `check` calls `Runtime.check`.
- `trial --mode startup` calls `Runtime.trial` and never returns `CLI_NOT_IMPLEMENTED` for supported Program input.
- `trial --mode scenario` remains structured failure until core-owned scenario executor lands.
- `compare` is backed by core-owned compare authority before being considered implemented.
- `CommandResult` has no `mode`.
- Every `CommandResult` has `inputCoordinate` and `primaryReportOutputKey`.
- `primaryReportOutputKey` points to a `VerificationControlPlaneReport` artifact.
- Artifact refs use only `artifacts[].outputKey`.
- Top-level `nextRecommendedStage` is the only Agent scheduling authority.
- Archived command files are deleted or renamed into final-behavior private helpers.
- Docs and examples teach only Agent First control-plane route.
- Old `085` remains superseded background only.
