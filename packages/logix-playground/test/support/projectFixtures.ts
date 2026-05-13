import { definePlaygroundProject } from '../../src/Project.js'

export const localCounterProjectFixture = definePlaygroundProject({
  id: 'logix-react.local-counter',
  files: {
    '/src/logic/localCounter.logic.ts': {
      language: 'ts',
      content: 'export const counterStep = 1',
      editable: true,
    },
    '/src/main.program.ts': {
      language: 'ts',
      content: [
        'import { Schema } from "effect"',
        'import * as Logix from "@logixjs/core"',
        'import { counterStep } from "./logic/localCounter.logic"',
        '',
        'const Counter = Logix.Module.make("FixtureCounter", {',
        '  state: Schema.Struct({ count: Schema.Number }),',
        '  actions: {',
        '    increment: Schema.Void,',
        '    decrement: Schema.Void,',
        '    setCount: Schema.Number,',
        '  },',
        '  reducers: {},',
        '})',
        '',
        'export const Program = Logix.Program.make(Counter, {',
        '  initial: { count: counterStep },',
        '  logics: [],',
        '})',
        '',
        'export const main = () => ({ count: counterStep })',
      ].join('\n'),
      editable: true,
    },
  },
  program: {
    entry: '/src/main.program.ts',
  },
  drivers: [
    {
      id: 'increase',
      label: 'Increase',
      operation: 'dispatch',
      actionTag: 'increment',
      payload: { kind: 'void' },
      readAnchors: [{ id: 'counter', label: 'Counter', target: 'state' }],
    },
  ],
  scenarios: [
    {
      id: 'counter-demo',
      label: 'Counter demo',
      description: 'Run a curated counter flow through the current Program session.',
      steps: [
        { id: 'increase-once', kind: 'driver', driverId: 'increase' },
        { id: 'settle-runtime', kind: 'settle', timeoutMs: 100 },
        { id: 'expect-state', kind: 'expect', target: 'state', assertion: 'changed' },
      ],
    },
  ],
  capabilities: {
    run: true,
    check: true,
    trialStartup: true,
  },
  fixtures: {
    seed: 'fixture',
  },
})
