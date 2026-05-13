import React from 'react'
import type { ScenarioExecutionState } from '../scenario/scenarioModel.js'
import type { ScenarioPlayback } from '../scenario/scenarioModel.js'

export interface ScenarioPanelProps {
  readonly scenarios: ReadonlyArray<ScenarioPlayback>
  readonly execution: ScenarioExecutionState
  readonly disabled?: boolean
  readonly onRunScenario: (scenario: ScenarioPlayback) => void
  readonly onStepScenario: (scenario: ScenarioPlayback) => void
}

export function ScenarioPanel({
  scenarios,
  execution,
  disabled = false,
  onRunScenario,
  onStepScenario,
}: ScenarioPanelProps): React.ReactElement | null {
  if (scenarios.length === 0) return null

  return (
    <section
      aria-label="Scenarios"
      data-playground-section="scenario"
      className="rounded-md border border-gray-200 bg-white text-gray-800 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-2">
        <div className="min-w-0">
          <h2 className="text-xs font-medium">Scenarios</h2>
          <p className="mt-0.5 truncate text-[11px] text-gray-500">product playback</p>
        </div>
        <span className="rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500">
          {execution.status}
        </span>
      </div>
      <div className="space-y-2 p-3">
        {scenarios.map((scenario) => (
          <div key={scenario.id} className="rounded-md border border-gray-100 bg-white px-3 py-2 hover:bg-gray-50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{scenario.label}</p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-gray-500">{scenario.id}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Step scenario ${scenario.label}`}
                  onClick={() => onStepScenario(scenario)}
                  className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Step
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Run scenario ${scenario.label}`}
                  onClick={() => onRunScenario(scenario)}
                  className="rounded-md border border-transparent px-2.5 py-1 text-xs font-medium text-blue-600 hover:border-blue-100 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  Run
                </button>
              </div>
            </div>
            {scenario.description ? (
              <p className="mt-2 text-xs text-gray-500">{scenario.description}</p>
            ) : null}
            <p className="mt-2 text-[11px] text-gray-500">{scenario.steps.length} steps</p>
          </div>
        ))}
      </div>
    </section>
  )
}
