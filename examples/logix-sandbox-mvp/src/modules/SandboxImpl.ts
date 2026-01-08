import { SandboxDef } from './SandboxModule'
import { SandboxLogic } from './SandboxLogic'

const DEFAULT_CODE = `// 简易示例：使用 @logixjs/core 定义一个计数器 Module + Logic，并在 Runtime 中运行
// - 在 /playground 路由下可以直接运行本示例
// - 你可以在此基础上改写 state / actions / logic，观察日志、Trace 与 stateSnapshot 的变化

import { Effect, Schema } from "effect";
import * as Logix from "@logixjs/core";

const CounterState = Schema.Struct({ count: Schema.Number });
const CounterActions = { inc: Schema.Void };

const CounterDef = Logix.Module.make("Counter", {
	state: CounterState,
	actions: CounterActions,
	immerReducers: {
		inc: (draft) => {
			draft.count += 1;
		},
	},
});

const CounterLogic = CounterDef.logic(($) => ({
	setup: Effect.void,
	run: Effect.gen(function* () {
		// 两种写法等价：直接 dispatch Action 或使用 dispatchers
		yield* $.dispatch({ _tag: "inc", payload: undefined });
		yield* $.dispatchers.inc();
	}),
}));

const CounterModule = CounterDef.implement({
	initial: { count: 0 },
	logics: [CounterLogic],
});

const program = Effect.gen(function* () {
	const runtime = Logix.Runtime.make(CounterModule);

	const state = yield* Effect.promise(() =>
		runtime.runPromise(
			Effect.gen(function* () {
				const counter = yield* CounterDef.tag;
				const state = yield* counter.getState;
				return state;
			}),
		),
	);

	yield* Effect.log("Counter final count: " + String(state.count));

	// 为了观察 Terminal 的“流式刷新”效果，追加一些带间隔的日志
	yield* Effect.log("Async log: step 1");
	yield* Effect.sleep("200 millis");
	yield* Effect.log("Async log: step 2 (+200ms)");
	yield* Effect.sleep("200 millis");
	yield* Effect.log("Async log: step 3 (+400ms)");
	return { ok: true, state };
});

export default program;
`

import { MOCK_SPEC_DATA } from '../types/spec'

export const SandboxModule = SandboxDef.implement({
  initial: {
    status: 'idle',
    logs: [],
    traces: [],
    error: null,
    runResult: null,
    activeTab: 'console',
    code: DEFAULT_CODE,
    autoImportLogix: true,
    uiIntents: [],
    scenarioId: '',
    scenarioSteps: [],
    mockManifestSource: '',
    semanticWidgets: [],
    intentScript: '',
    kernelId: 'core',
    strict: true,
    allowFallback: false,
    kernels: [],
    defaultKernelId: 'core',
    specFeatures: MOCK_SPEC_DATA,
    selectedFeatureId: null,
    selectedStoryId: null,
    selectedStepId: null,
    stepIntentScriptDraft: '',
  },
  logics: [SandboxLogic],
})

export const SandboxImpl = SandboxModule.impl
