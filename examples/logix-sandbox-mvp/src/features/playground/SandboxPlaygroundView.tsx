import React from 'react'
import { shallow, useDispatch, useSelector } from '@logixjs/react'
import { Editor } from '../../components/Editor'
import type { SandboxRuntime, SandboxTab } from '../../modules/SandboxRuntime'
import { useStableBusy } from '../../pages/_shared/useStableBusy'
import {
  AlertBox,
  SandboxErrorDetails,
  Header,
  HttpView,
  MemoConsoleView,
  ResultView,
  StatusBar,
  Tabs,
  TracesView,
  UiIntentRawPanel,
} from '../../pages/_shared/SandboxShell'

function PlaygroundHeader({ runtime }: { runtime: SandboxRuntime }) {
  const view = useSelector(
    runtime,
    (s) => ({
      status: s.status,
      kernelId: s.kernelId,
      strict: s.strict,
      allowFallback: s.allowFallback,
      kernels: s.kernels,
      defaultKernelId: s.defaultKernelId,
      autoImportLogix: s.autoImportLogix,
    }),
    shallow,
  )

  const { status, kernelId, strict, allowFallback, kernels, defaultKernelId, autoImportLogix } = view

  const dispatch = useDispatch(runtime)
  const isRunning = status === 'running'
  const uiRunning = useStableBusy(isRunning, { delayMs: 120, minDurationMs: 240 })
  const headerDisabled = status === 'idle' || status === 'initializing'

  return (
    <Header
      status={status}
      isRunning={isRunning}
      uiRunning={uiRunning}
      kernel={{
        kernelId,
        strict,
        allowFallback,
        kernels,
        defaultKernelId,
        onChangeKernelId: (nextKernelId) => dispatch({ _tag: 'setKernelId', payload: nextKernelId }),
        onChangeStrict: (nextStrict) => dispatch({ _tag: 'setKernelStrict', payload: nextStrict }),
        onChangeAllowFallback: (nextAllowFallback) =>
          dispatch({
            _tag: 'setKernelAllowFallback',
            payload: nextAllowFallback,
          }),
      }}
      codegen={{
        autoImportLogix,
        onChangeAutoImportLogix: (next) => dispatch({ _tag: 'setAutoImportLogix', payload: next }),
      }}
      onRun={() => dispatch({ _tag: 'run', payload: undefined })}
      disabled={headerDisabled}
    />
  )
}

function PlaygroundEditorPanel({ runtime }: { runtime: SandboxRuntime }) {
  const code = useSelector(runtime, (s) => s.code)
  const dispatch = useDispatch(runtime)

  return (
    <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-200 dark:border-white/5">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">playground.tsx</span>
        </div>
        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Code</div>
      </div>
      <div className="relative flex-1 bg-white dark:bg-zinc-900/30">
        <Editor
          code={code ?? ''}
          onChange={(val) => dispatch({ _tag: 'setCode', payload: val })}
          language="typescript"
          filename="playground.tsx"
          enableTypeSense
        />
      </div>
    </div>
  )
}

function PlaygroundOutputPanel({ runtime }: { runtime: SandboxRuntime }) {
  const view = useSelector(
    runtime,
    (s) => ({
      logs: s.logs,
      traces: s.traces,
      error: s.error,
      runResult: s.runResult,
      activeTab: s.activeTab,
      uiIntents: s.uiIntents,
    }),
    shallow,
  )
  const { logs, traces, error, runResult, activeTab, uiIntents } = view

  const compileError = error?.code === 'RUNTIME_ERROR' ? error : null
  const dispatch = useDispatch(runtime)

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-50/50 dark:bg-zinc-950/50">
      <Tabs
        activeTab={activeTab}
        onTabChange={(tab: SandboxTab) => dispatch({ _tag: 'setTab', payload: tab })}
        logs={logs}
        traces={traces}
        uiIntents={uiIntents}
      />

      <div className="flex-1 overflow-auto p-4 bg-white dark:bg-zinc-950">
        {compileError && (
          <AlertBox title="Compilation Failed" type="error" className="mb-4">
            <div className="font-mono text-xs">{compileError.message}</div>
          </AlertBox>
        )}

        {error && error.code !== 'RUNTIME_ERROR' && (
          <AlertBox title={`System Error · ${error.code}`} type="error" className="mb-4">
            <SandboxErrorDetails error={error} />
          </AlertBox>
        )}

        <div className="min-h-full">
          {activeTab === 'console' && <MemoConsoleView logs={logs} />}
          {activeTab === 'result' && <ResultView result={runResult} />}
          {activeTab === 'traces' && <TracesView traces={traces} />}
          {activeTab === 'http' && <HttpView traces={traces} />}
          {activeTab === 'ui' && <UiIntentRawPanel intents={uiIntents} />}
        </div>
      </div>
    </div>
  )
}

function PlaygroundStatusBar({ runtime }: { runtime: SandboxRuntime }) {
  const status = useSelector(runtime, (s) => s.status)
  return <StatusBar status={status} />
}

export function SandboxPlaygroundView({ runtime }: { runtime: SandboxRuntime }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      <PlaygroundHeader runtime={runtime} />

      <main className="flex flex-1 overflow-hidden">
        <PlaygroundEditorPanel runtime={runtime} />
        <PlaygroundOutputPanel runtime={runtime} />
      </main>

      <PlaygroundStatusBar runtime={runtime} />
    </div>
  )
}
