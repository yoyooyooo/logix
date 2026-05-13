import {
  definePlaygroundProject,
  playgroundProjectSourcePaths,
  type PlaygroundProject,
} from '@logixjs/playground/Project'

export interface PressureFixture {
  readonly id: string
  readonly authorityClass: 'visual-pressure-only'
  readonly routeSuggestion: string
  readonly activeInspectorTab: 'Actions' | 'Drivers' | 'Diagnostics'
  readonly activeBottomTab: 'Console' | 'Diagnostics' | 'Trace' | 'Snapshot' | 'Scenario'
  readonly dataProfile: Readonly<Record<string, number>>
  readonly scrollOwners: ReadonlyArray<string>
  readonly stickyRegions: ReadonlyArray<string>
  readonly requiredVisibleRegions: ReadonlyArray<string>
  readonly forbiddenOverflow: ReadonlyArray<string>
}

export interface PressureProjectInput {
  readonly id: string
  readonly pressure: Omit<PressureFixture, 'routeSuggestion' | 'authorityClass'>
  readonly actionCount: number
  readonly initialState?: string
}

const mainProgramPath = playgroundProjectSourcePaths.mainProgram

const makeActionsBlock = (count: number): string =>
  Array.from({ length: count }, (_, index) => {
    const actionId = String(index + 1).padStart(2, '0')
    return `    action${actionId}: Schema.Void,`
  }).join('\n')

const makeProgramSource = ({
  moduleId,
  initialState,
}: {
  readonly moduleId: string
  readonly initialState: string
}): string => [
  'import { Effect, Schema } from "effect"',
  'import * as Logix from "@logixjs/core"',
  'import { pressureActions } from "./actions"',
  '',
  `const PressureModule = Logix.Module.make("${moduleId}", {`,
  '  state: Schema.Struct({ count: Schema.Number, label: Schema.String }),',
  '  actions: pressureActions,',
  '  reducers: {},',
  '})',
  '',
  'export const Program = Logix.Program.make(PressureModule, {',
  `  initial: ${initialState},`,
  '  logics: [],',
  '})',
  '',
  `export const main = () => Effect.succeed(${initialState})`,
].join('\n')

const makeActionsSource = (actionCount: number): string => [
  'import { Schema as PressureSchema } from "effect"',
  '',
  'export const pressureActions = {',
  makeActionsBlock(actionCount).replace(/Schema\./g, 'PressureSchema.'),
  '}',
].join('\n')

const makePressureFiles = ({
  id,
  actionCount,
}: {
  readonly id: string
  readonly actionCount: number
}): PlaygroundProject['files'] => ({
  '/src/actions.ts': {
    language: 'ts',
    content: makeActionsSource(actionCount),
    editable: true,
  },
  '/src/drivers.ts': {
    language: 'ts',
    content: [
      'export const drivers = [',
      '  { id: "submit-form", action: "action01" },',
      '  { id: "change-country", action: "action02" },',
      '  { id: "load-cities", action: "action03" },',
      ']',
    ].join('\n'),
    editable: true,
  },
  '/src/types.ts': {
    language: 'ts',
    content: [
      'export interface PressureState {',
      '  readonly count: number',
      '  readonly label: string',
      '}',
    ].join('\n'),
    editable: true,
  },
  '/src/helpers.ts': {
    language: 'ts',
    content: [
      'export const pressureTag = (name: string): string => `pressure:${name}`',
      'export const projectId = ' + JSON.stringify(id),
    ].join('\n'),
    editable: true,
  },
  '/src/config.json': {
    language: 'json',
    content: JSON.stringify({ projectId: id, profile: 'visual-pressure', actionCount }, null, 2),
    editable: true,
  },
  '/package.json': {
    language: 'json',
    content: JSON.stringify({ name: id, private: true, type: 'module' }, null, 2),
    editable: false,
  },
  '/tsconfig.json': {
    language: 'json',
    content: JSON.stringify({ compilerOptions: { strict: true, module: 'ESNext' } }, null, 2),
    editable: false,
  },
  '/README.md': {
    language: 'md',
    content: `# ${id}\n\nVisual pressure fixture for the Logix Playground workbench.`,
    editable: true,
  },
})

export const definePressureProject = ({
  id,
  pressure,
  actionCount,
  initialState = '{ count: 0, label: "pressure" }',
}: PressureProjectInput): PlaygroundProject => definePlaygroundProject({
  id,
  files: {
    ...makePressureFiles({ id, actionCount }),
    [mainProgramPath]: {
      language: 'ts',
      content: makeProgramSource({
        moduleId: id.replace(/[.-]/g, '_'),
        initialState,
      }),
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
    pressure: {
      ...pressure,
      authorityClass: 'visual-pressure-only',
      routeSuggestion: `/playground/${id}`,
    },
  },
})
