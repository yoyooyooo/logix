import { defineDiagnosticsDemoProject } from '../shared'

const mainProgramSource = [
  'import { Effect, Schema } from "effect"',
  'import * as Logix from "@logixjs/core"',
  '',
  'const Root = Logix.Module.make("Diagnostics.RunUndefinedValue", {',
  '  state: Schema.Void,',
  '  actions: {},',
  '})',
  '',
  'export const Program = Logix.Program.make(Root, {',
  '  initial: undefined,',
  '  logics: [],',
  '})',
  '',
  'export const main = () => Effect.sync(() => undefined)',
].join('\n')

export const logixReactRunUndefinedValueDiagnosticsProject = defineDiagnosticsDemoProject({
  id: 'logix-react.diagnostics.run-undefined-value',
  demoId: 'run-undefined-value',
  authorityClass: 'runtime-run-result',
  title: 'Run undefined value diagnostics',
  mainProgramSource,
  expectedCodes: ['runtime-run-value:undefined'],
  expectedAuthorities: [],
  expectedEvidence: ['valueKind:undefined', 'undefined-to-null'],
})
