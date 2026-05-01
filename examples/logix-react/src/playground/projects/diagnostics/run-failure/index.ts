import { defineDiagnosticsDemoProject } from '../shared'

const mainProgramSource = [
  'import { Effect, Schema } from "effect"',
  'import * as Logix from "@logixjs/core"',
  '',
  'const Root = Logix.Module.make("Diagnostics.RunFailure", {',
  '  state: Schema.Void,',
  '  actions: {},',
  '})',
  '',
  'export const Program = Logix.Program.make(Root, {',
  '  initial: undefined,',
  '  logics: [],',
  '})',
  '',
  'export const main = () => Effect.fail(new Error("run failure demo"))',
].join('\n')

export const logixReactRunFailureDiagnosticsProject = defineDiagnosticsDemoProject({
  id: 'logix-react.diagnostics.run-failure',
  demoId: 'run-failure',
  authorityClass: 'runtime-run-failure',
  title: 'Run failure diagnostics',
  mainProgramSource,
  expectedCodes: ['runtime-run-failure'],
  expectedAuthorities: [],
  expectedEvidence: ['run failure demo'],
})
