import { defineDiagnosticsDemoProject } from '../shared'

const mainProgramSource = [
  'import { Effect, Schema, ServiceMap } from "effect"',
  'import * as Logix from "@logixjs/core"',
  '',
  'class BusinessService extends ServiceMap.Service<BusinessService, { readonly ping: Effect.Effect<void> }>()("BusinessService") {}',
  '',
  'const Root = Logix.Module.make("Diagnostics.TrialMissingService", {',
  '  state: Schema.Struct({ ok: Schema.Boolean }),',
  '  actions: { noop: Schema.Void },',
  '})',
  '',
  'export const Program = Logix.Program.make(Root, {',
  '  initial: { ok: true },',
  '  logics: [',
  '    Root.logic<BusinessService>("read-service-on-startup", ($) => {',
  '      $.readyAfter(Effect.asVoid(Effect.service(BusinessService).pipe(Effect.orDie)), { id: "business-service" })',
  '      return Effect.void',
  '    }),',
  '  ],',
  '})',
  '',
  'export const main = () => Effect.succeed({ trialDemo: "missing-service" })',
].join('\n')

export const logixReactTrialMissingServiceDiagnosticsProject = defineDiagnosticsDemoProject({
  id: 'logix-react.diagnostics.trial-missing-service',
  demoId: 'trial-missing-service',
  authorityClass: 'runtime-trial-report',
  title: 'Trial missing service diagnostics',
  mainProgramSource,
  expectedCodes: ['MissingDependency'],
  expectedAuthorities: ['runtime.trial/startup'],
  expectedEvidence: ['service:BusinessService'],
  expectedTrialDependencyKinds: ['service'],
})
