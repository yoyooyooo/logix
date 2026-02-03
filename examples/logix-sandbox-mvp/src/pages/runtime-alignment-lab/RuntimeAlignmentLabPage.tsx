import React, { useEffect } from 'react'
import { shallow, useDispatch, useModule, useSelector } from '@logixjs/react'
import { SandboxDef } from '../../modules/SandboxModule'
import type { SandboxRuntime, SandboxTab } from '../../modules/SandboxRuntime'
import { SpecNavigation } from '../../components/SpecNavigation'
import { StepDetailPanel } from '../../components/StepDetailPanel'
import { useStableBusy } from '../_shared/useStableBusy'
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
} from '../_shared/SandboxShell'
import { UiIntentView } from './UiIntentView'

function RuntimeHeader({ runtime }: { runtime: SandboxRuntime }) {
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

function RuntimeLowerPanel({ runtime }: { runtime: SandboxRuntime }) {
  const view = useSelector(
    runtime,
    (s) => ({
      logs: s.logs,
      traces: s.traces,
      error: s.error,
      runResult: s.runResult,
      activeTab: s.activeTab,
      uiIntents: s.uiIntents,
      scenarioId: s.scenarioId,
      scenarioSteps: s.scenarioSteps,
      mockManifestSource: s.mockManifestSource,
      semanticWidgets: s.semanticWidgets,
    }),
    shallow,
  )

  const {
    logs,
    traces,
    error,
    runResult,
    activeTab,
    uiIntents,
    scenarioId,
    scenarioSteps,
    mockManifestSource,
    semanticWidgets,
  } = view

  const compileError = error?.code === 'RUNTIME_ERROR' ? error : null
  const dispatch = useDispatch(runtime)

  return (
    <div className="flex-1 flex min-h-0 bg-zinc-50/50 dark:bg-zinc-950/50">
      <div className="w-full flex flex-col">
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

          <div className="min-h-full pb-20">
            {activeTab === 'console' && <MemoConsoleView logs={logs} />}
            {activeTab === 'result' && <ResultView result={runResult} />}
            {activeTab === 'traces' && <TracesView traces={traces} />}
            {activeTab === 'http' && <HttpView traces={traces} />}
            {activeTab === 'ui' && (
              <UiIntentView
                intents={uiIntents}
                scenarioId={scenarioId}
                scenarioSteps={scenarioSteps}
                mockManifestSource={mockManifestSource}
                semanticWidgets={semanticWidgets}
                onChangeScenarioId={(id) => dispatch({ _tag: 'setScenarioId', payload: id })}
                onChangeSteps={(steps) => dispatch({ _tag: 'setScenarioSteps', payload: steps })}
                onChangeMock={(val) => dispatch({ _tag: 'setMockManifestSource', payload: val })}
                onEmitIntent={(packet) => {
                  dispatch({ _tag: 'addUiIntent', payload: packet })
                  dispatch({ _tag: 'uiCallbackFromMockUi', payload: packet })
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RuntimeStatusBar({ runtime }: { runtime: SandboxRuntime }) {
  const status = useSelector(runtime, (s) => s.status)
  return <StatusBar status={status} />
}

export function RuntimeAlignmentLabPage() {
  const runtime: SandboxRuntime = useModule(SandboxDef)
  const dispatch = useDispatch(runtime)

  useEffect(() => {
    dispatch({ _tag: 'init', payload: undefined })
  }, [dispatch])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      <RuntimeHeader runtime={runtime} />

      <main className="flex flex-1 overflow-hidden">
        {/* TOP: Spec Navigation & Editor Split */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* UPPER SEARCH / NAV AREA (60% height) */}
          <div className="h-[55%] flex border-b border-zinc-200 dark:border-white/5">
            {/* Left: 3-Column Spec Finder */}
            <div className="w-[65%] border-r border-zinc-200 dark:border-white/5 bg-zinc-50/30 dark:bg-zinc-900/30">
              <SpecNavigation />
            </div>

            {/* Right: Step Details / Intent Script Editor */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900 overflow-hidden">
              <StepDetailPanel />
            </div>
          </div>

          {/* LOWER RUNTIME AREA (45% height) */}
          <RuntimeLowerPanel runtime={runtime} />
        </div>
      </main>

      <RuntimeStatusBar runtime={runtime} />
    </div>
  )
}
