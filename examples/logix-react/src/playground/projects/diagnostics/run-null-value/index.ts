import { defineDiagnosticsDemoProject } from '../shared'

const mainProgramSource = [
  'import { Effect, Schema } from "effect"',
  'import * as Logix from "@logixjs/core"',
  '',
  'const Root = Logix.Module.make("Diagnostics.RunNullValue", {',
  '  state: Schema.Void,',
  '  actions: {},',
  '})',
  '',
  'export const Program = Logix.Program.make(Root, {',
  '  initial: undefined,',
  '  logics: [],',
  '})',
  '',
  'export const main = () => Effect.succeed(null)',
].join('\n')

export const logixReactRunNullValueDiagnosticsProject = defineDiagnosticsDemoProject({
  id: 'logix-react.diagnostics.run-null-value',
  demoId: 'run-null-value',
  authorityClass: 'runtime-run-result',
  title: 'Run null value diagnostics',
  mainProgramSource,
  expectedCodes: ['runtime-run-value:null'],
  expectedAuthorities: [],
  expectedEvidence: ['valueKind:null', 'lossy:false'],
})
