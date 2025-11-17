import React from 'react'
import { useModule, useSelector, useDispatch } from '@logix/react'
import { SandboxDef } from '../modules/SandboxModule'
import type { SandboxRuntime, SandboxState } from '../modules/SandboxRuntime'

type SpecFeature = SandboxState['specFeatures'][number]
type SpecStory = SpecFeature['stories'][number]
type SpecScenario = SpecStory['scenarios'][number]
type SpecStep = SpecScenario['steps'][number]

export function SpecNavigation() {
  const runtime: SandboxRuntime = useModule(SandboxDef)
  const specFeatures = useSelector(runtime, (s) => s.specFeatures)
  const selectedFeatureId = useSelector(runtime, (s) => s.selectedFeatureId)
  const selectedStoryId = useSelector(runtime, (s) => s.selectedStoryId)
  const selectedScenarioId = useSelector(runtime, (s) => s.scenarioId)
  const selectedStepId = useSelector(runtime, (s) => s.selectedStepId)

  const dispatch = useDispatch(runtime)

  // Derived Data
  const currentFeature = specFeatures.find((f) => f.id === selectedFeatureId)
  const currentStory = currentFeature?.stories.find((s) => s.id === selectedStoryId)
  const currentScenario = currentStory?.scenarios.find((s) => s.id === selectedScenarioId)

  // Handlers
  const handleFeatureClick = (id: string) => {
    dispatch({
      _tag: 'setSpecSelection',
      payload: { featureId: id, storyId: null, scenarioId: null, stepId: null },
    })
  }

  const handleStoryClick = (id: string) => {
    dispatch({
      _tag: 'setSpecSelection',
      payload: { featureId: selectedFeatureId, storyId: id, scenarioId: null, stepId: null },
    })
  }

  const handleScenarioClick = (scenario: SpecScenario) => {
    dispatch({
      _tag: 'setSpecSelection',
      payload: {
        featureId: selectedFeatureId,
        storyId: selectedStoryId,
        scenarioId: scenario.id,
        stepId: null,
      },
    })
  }

  const handleStepClick = (step: SpecStep) => {
    dispatch({
      _tag: 'setSpecSelection',
      payload: {
        featureId: selectedFeatureId,
        storyId: selectedStoryId,
        scenarioId: selectedScenarioId,
        stepId: step.id,
      },
    })
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur-sm select-none">
      {/* Column 1: Features */}
      <FinderColumn
        title="Features"
        width="min-w-[180px] w-1/4"
        className="border-r border-zinc-200 dark:border-white/5"
      >
        <div className="p-2 space-y-1">
          {specFeatures.map((feat) => (
            <FinderItem
              key={feat.id}
              active={feat.id === selectedFeatureId}
              onClick={() => handleFeatureClick(feat.id)}
              label={feat.title}
              subLabel={feat.description}
              icon="feature"
            />
          ))}
        </div>
      </FinderColumn>

      {/* Column 2: Stories */}
      <FinderColumn
        title="Stories"
        width="min-w-[180px] w-1/4"
        className="border-r border-zinc-200 dark:border-white/5"
      >
        <div className="p-2 space-y-1">
          {currentFeature ? (
            currentFeature.stories.map((story) => (
              <FinderItem
                key={story.id}
                active={story.id === selectedStoryId}
                onClick={() => handleStoryClick(story.id)}
                label={story.title}
                subLabel={story.userStory}
                icon="story"
              />
            ))
          ) : (
            <EmptyHint>Select a Feature</EmptyHint>
          )}
        </div>
      </FinderColumn>

      {/* Column 3: Scenarios */}
      <FinderColumn
        title="Scenarios"
        width="min-w-[200px] w-1/4"
        className="border-r border-zinc-200 dark:border-white/5"
      >
        <div className="p-2 space-y-1">
          {selectedStoryId ? (
            currentStory?.scenarios.map((scenario) => (
              <FinderItem
                key={scenario.id}
                active={scenario.id === selectedScenarioId}
                onClick={() => handleScenarioClick(scenario)}
                label={scenario.title}
                subLabel={scenario.description}
                icon="scenario"
              />
            ))
          ) : (
            <EmptyHint>Select a Story</EmptyHint>
          )}
        </div>
      </FinderColumn>

      {/* Column 4: Steps */}
      <FinderColumn title="Steps" width="min-w-[150px] flex-1">
        <div className="p-2 space-y-1">
          {selectedScenarioId ? (
            currentScenario?.steps.map((step) => (
              <FinderItem
                key={step.id}
                active={step.id === selectedStepId}
                onClick={() => handleStepClick(step)}
                label={step.label}
                icon="step"
                badge={`Step ${step.id}`}
              />
            ))
          ) : (
            <EmptyHint>Select a Scenario</EmptyHint>
          )}
        </div>
      </FinderColumn>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Sub-components (Visual Polish)
// ----------------------------------------------------------------------------

function FinderColumn({
  title,
  children,
  width,
  className = '',
}: {
  title: string
  children: React.ReactNode
  width: string
  className?: string
}) {
  return (
    <div className={`flex flex-col h-full bg-white/40 dark:bg-zinc-900/40 ${width} ${className}`}>
      <div className="flex-none px-3 py-2 border-b border-zinc-200 dark:border-white/5 backdrop-blur-md bg-white/60 dark:bg-zinc-900/60 z-10 sticky top-0">
        <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  )
}

function FinderItem({
  active,
  onClick,
  label,
  subLabel,
  icon,
  badge,
}: {
  active: boolean
  onClick: () => void
  label: string
  subLabel?: string
  icon?: 'feature' | 'story' | 'scenario' | 'step'
  badge?: string
}) {
  return (
    <div
      onClick={onClick}
      className={`
        group relative px-3 py-2.5 rounded-lg cursor-default transition-all duration-200
        ${
          active
            ? 'bg-indigo-600 shadow-md shadow-indigo-500/20 text-white'
            : 'hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon / Indicator */}
        <div className={`mt-0.5 flex-none opacity-80 ${active ? 'text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>
          {icon === 'feature' && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          )}
          {icon === 'story' && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          )}
          {icon === 'scenario' && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          )}
          {icon === 'step' && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          )}
          {!icon && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className={`text-sm font-medium leading-tight truncate ${active ? 'text-white' : ''}`}>{label}</div>
            {badge && (
              <div
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${active ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}
              >
                {badge}
              </div>
            )}
          </div>
          {subLabel && (
            <div
              className={`mt-1 text-[11px] leading-snug line-clamp-2 ${active ? 'text-indigo-100' : 'text-zinc-500 dark:text-zinc-500'}`}
            >
              {subLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-40 flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-600 italic">
      {children}
    </div>
  )
}
