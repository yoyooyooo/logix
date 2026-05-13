import {
  definePlaygroundProject,
  playgroundProjectSourcePaths,
  type PlaygroundProject,
} from '@logixjs/playground/Project'

export interface DiagnosticsDemoFixture {
  readonly id: string
  readonly authorityClass:
    | 'runtime-check-report'
    | 'runtime-trial-report'
    | 'runtime-run-result'
    | 'runtime-run-failure'
    | 'payload-validation'
    | 'reflection-manifest'
    | 'workbench-evidence-gap'
  readonly routeSuggestion: string
  readonly expectedCodes: ReadonlyArray<string>
  readonly expectedAuthorities: ReadonlyArray<'runtime.check/static' | 'runtime.trial/startup'>
  readonly expectedEvidence: ReadonlyArray<string>
  readonly expectedTrialDependencyKinds?: ReadonlyArray<'config' | 'service' | 'program-import'>
}

export interface DiagnosticsDemoProjectInput {
  readonly id: string
  readonly demoId: string
  readonly authorityClass: DiagnosticsDemoFixture['authorityClass']
  readonly title: string
  readonly mainProgramSource: string
  readonly expectedCodes: ReadonlyArray<string>
  readonly expectedAuthorities: ReadonlyArray<'runtime.check/static' | 'runtime.trial/startup'>
  readonly expectedEvidence: ReadonlyArray<string>
  readonly expectedTrialDependencyKinds?: ReadonlyArray<'config' | 'service' | 'program-import'>
}

const mainProgramPath = playgroundProjectSourcePaths.mainProgram

const makePackageSource = (id: string): string =>
  JSON.stringify({ name: id, private: true, type: 'module' }, null, 2)

const makeTsconfigSource = (): string =>
  JSON.stringify({ compilerOptions: { strict: true, module: 'ESNext' } }, null, 2)

export const defineDiagnosticsDemoProject = ({
  id,
  demoId,
  authorityClass,
  title,
  mainProgramSource,
  expectedCodes,
  expectedAuthorities,
  expectedEvidence,
  expectedTrialDependencyKinds,
}: DiagnosticsDemoProjectInput): PlaygroundProject => definePlaygroundProject({
  id,
  files: {
    [mainProgramPath]: {
      language: 'ts',
      content: mainProgramSource,
      editable: true,
    },
    '/package.json': {
      language: 'json',
      content: makePackageSource(id),
      editable: false,
    },
    '/tsconfig.json': {
      language: 'json',
      content: makeTsconfigSource(),
      editable: false,
    },
    '/README.md': {
      language: 'md',
      content: `# ${title}\n\nFocused Playground route for real Runtime Check/Trial diagnostics.`,
      editable: true,
    },
  },
  program: {
    entry: mainProgramPath,
  },
  capabilities: {
    run: true,
    check: true,
    trialStartup: true,
  },
  fixtures: {
    diagnosticsDemo: {
      id: demoId,
      authorityClass,
      routeSuggestion: `/playground/${id}`,
      expectedCodes,
      expectedAuthorities,
      expectedEvidence,
      expectedTrialDependencyKinds,
    } satisfies DiagnosticsDemoFixture,
  },
})
