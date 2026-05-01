import { defineDiagnosticsDemoProject } from '../shared'

const mainProgramSource = [
  'import { Effect, Schema } from "effect"',
  'import * as Logix from "@logixjs/core"',
  '',
  'const Root = Logix.Module.make("Diagnostics.ReflectionActionGap", {',
  '  state: Schema.Void,',
  '  actions: {',
  '    ping: Schema.Void,',
  '  } as const,',
  '})',
  '',
  'export const Program = Logix.Program.make(Root, {',
  '  initial: undefined,',
  '  logics: [],',
  '})',
  '',
  'export const main = () => Effect.succeed("reflection action gap route")',
].join('\n')

export const logixReactReflectionActionGapDiagnosticsProject = defineDiagnosticsDemoProject({
  id: 'logix-react.diagnostics.reflection-action-gap',
  demoId: 'reflection-action-gap',
  authorityClass: 'workbench-evidence-gap',
  title: 'Reflection action evidence gap diagnostics',
  mainProgramSource,
  expectedCodes: ['missing-manifest', 'fallback-source-regex'],
  expectedAuthorities: [],
  expectedEvidence: ['Runtime reflection manifest is unavailable.'],
})
