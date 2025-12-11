import { SandboxModule } from './SandboxModule'
import { SandboxLogic } from './SandboxLogic'

const DEFAULT_CODE = `// 简易示例：使用 @logix/core 定义一个计数器 Module + Logic，并在 Runtime 中运行
// - 在 /playground 路由下可以直接运行本示例
// - 你可以在此基础上改写 state / actions / logic，观察日志、Trace 与 stateSnapshot 的变化

import { Effect, Schema } from "effect";
import * as Logix from "@logix/core";

const CounterState = Schema.Struct({ count: Schema.Number });
const CounterActions = { inc: Schema.Void };

const CounterModule = Logix.Module.make("Counter", {
  state: CounterState,
  actions: CounterActions,
  reducers: {
    inc: (s) => ({ ...s, count: s.count + 1 }),
  },
});

const CounterLogic = CounterModule.logic(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    // 两种写法等价：直接 dispatch Action 或调用 reducers
    yield* $.actions.dispatch({ _tag: "inc", payload: undefined });
    yield* $.actions.inc();
  }),
}));

const CounterImpl = CounterModule.implement({
  initial: { count: 0 },
  logics: [CounterLogic],
});

const program = Effect.gen(function* () {
  const runtime = Logix.Runtime.make(CounterImpl);

  const state = yield* Effect.promise(() =>
    runtime.runPromise(
      Effect.gen(function* () {
        const counter = yield* CounterModule;
        const state = yield* counter.getState;
        return state;
      }),
    ),
  );

  yield* Effect.log("Counter final count: " + String(state.count));
  return { ok: true, state };
});

export default program;
`

import { MOCK_SPEC_DATA } from '../types/spec'

export const SandboxImpl = SandboxModule.implement({
  initial: {
    status: 'idle',
    logs: [],
    traces: [],
    error: null,
    runResult: null,
    activeTab: 'console',
    code: DEFAULT_CODE,
    isRunning: false,
    uiIntents: [],
    scenarioId: '',
    scenarioSteps: [],
    mockManifestSource: '',
    semanticWidgets: [],
    intentScript: '',
    specFeatures: MOCK_SPEC_DATA,
    selectedFeatureId: null,
    selectedStoryId: null,
    selectedStepId: null,
  },
  logics: [SandboxLogic],
})
