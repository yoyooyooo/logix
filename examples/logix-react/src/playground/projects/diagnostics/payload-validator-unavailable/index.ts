import { defineDiagnosticsDemoProject } from '../shared'

const mainProgramSource = [
  'import { Effect, Schema } from "effect"',
  'import * as Logix from "@logixjs/core"',
  '',
  'const Root = Logix.Module.make("Diagnostics.PayloadValidatorUnavailable", {',
  '  state: Schema.Struct({ count: Schema.Number }),',
  '  actions: {',
  '    submit: Schema.Number,',
  '  } as const,',
  '  reducers: {',
  '    submit: (state, action) => ({ ...state, count: action.payload }),',
  '  },',
  '})',
  '',
  'export const Program = Logix.Program.make(Root, {',
  '  initial: { count: 0 },',
  '  logics: [],',
  '})',
  '',
  'export const main = () => Effect.succeed({ count: 0 })',
].join('\n')

export const logixReactPayloadValidatorUnavailableDiagnosticsProject = defineDiagnosticsDemoProject({
  id: 'logix-react.diagnostics.payload-validator-unavailable',
  demoId: 'payload-validator-unavailable',
  authorityClass: 'payload-validation',
  title: 'Payload validator unavailable diagnostics',
  mainProgramSource,
  expectedCodes: ['unknown-payload-schema'],
  expectedAuthorities: [],
  expectedEvidence: ['Payload schema is unavailable for validation.'],
})
