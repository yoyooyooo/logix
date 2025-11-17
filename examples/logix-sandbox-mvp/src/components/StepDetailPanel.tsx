import React, { useEffect } from 'react'
import { useModule, useSelector, useDispatch } from '@logix/react'
import { SandboxDef } from '../modules/SandboxModule'
import type { SandboxRuntime, SandboxState } from '../modules/SandboxRuntime'
import { Editor } from './Editor'

type SpecFeature = SandboxState['specFeatures'][number]
type SpecStory = SpecFeature['stories'][number]
type SpecScenario = SpecStory['scenarios'][number]
type SpecStep = SpecScenario['steps'][number]

export function StepDetailPanel() {
  const runtime: SandboxRuntime = useModule(SandboxDef)
  const dispatch = useDispatch(runtime)

  // Selectors
  const specFeatures = useSelector(runtime, (s) => s.specFeatures)
  const selectedFeatureId = useSelector(runtime, (s) => s.selectedFeatureId)
  const selectedStoryId = useSelector(runtime, (s) => s.selectedStoryId)
  const selectedScenarioId = useSelector(runtime, (s) => s.scenarioId)
  const selectedStepId = useSelector(runtime, (s) => s.selectedStepId)
  const stepIntentScriptDraft = useSelector(runtime, (s) => s.stepIntentScriptDraft)

  // Derived Data
  const currentFeature: SpecFeature | undefined = specFeatures.find((f) => f.id === selectedFeatureId)
  const currentStory: SpecStory | undefined = currentFeature?.stories.find((s) => s.id === selectedStoryId)
  const currentScenario: SpecScenario | undefined = currentStory?.scenarios.find((s) => s.id === selectedScenarioId)
  const currentStep: SpecStep | undefined = currentScenario?.steps.find((s) => s.id === selectedStepId)

  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state when selected step changes
  useEffect(() => {
    if (currentStep) {
      dispatch({ _tag: 'setStepIntentScriptDraft', payload: currentStep.intentScript || '' })
    }
  }, [currentStep?.id, dispatch])

  const handleEditorChange = (val: string) => {
    dispatch({ _tag: 'setStepIntentScriptDraft', payload: val })

    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (!currentStep?.id) return
      dispatch({
        _tag: 'updateStepIntentScript',
        payload: {
          stepId: currentStep.id,
          intentScript: val,
        },
      })
    }, 300)
  }

  // Debug logging
  // console.log('StepDetailPanel Render:', { stepId: currentStep?.id, localScriptLen: stepIntentScriptDraft.length })

  if (!currentStep) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-600 p-4">
        <svg className="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span className="text-sm font-medium mb-4">No Step Selected</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></span>
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            Step {currentStep.id}: {currentStep.label}
          </span>
        </div>
        <div className="text-[10px] font-mono text-zinc-400">{selectedScenarioId}</div>
      </div>

      {/* Editor Section */}
      <div className="flex-1 flex flex-col min-h-0 bg-zinc-50/30 dark:bg-zinc-900/10">
        <div className="px-4 py-2 border-b border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-800/50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Step Intent Script</span>
        </div>
        <div className="relative flex-1">
          <Editor code={stepIntentScriptDraft} onChange={handleEditorChange} />
        </div>
      </div>

      {/* Expectations / Meta (Placeholder for future) */}
      <div className="h-1/3 border-t border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/20 p-4 overflow-auto">
        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Expectations</h4>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono space-y-1">
          {currentStep.expectations ? (
            <pre className="whitespace-pre-wrap">{JSON.stringify(currentStep.expectations, null, 2)}</pre>
          ) : (
            <span className="italic opacity-50">No explicit expectations defined.</span>
          )}
        </div>
      </div>
    </div>
  )
}
