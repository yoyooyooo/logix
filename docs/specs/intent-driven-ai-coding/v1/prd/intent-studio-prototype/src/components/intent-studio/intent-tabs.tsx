import { useState } from 'react'
import type { ChangeEvent } from 'react'
import YAML from 'yaml'
import { patternsById } from '../../data'
import { useIntentStore } from '../../stores/use-intent-store'
import type { IntentSpec } from '../../types'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'domain', label: 'Domain' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'yaml', label: 'YAML' },
]

interface TabProps {
  intent: IntentSpec
  onUpdate: (patch: Partial<IntentSpec>) => void
}

function OverviewTab({ intent, onUpdate }: TabProps) {
  const handleGoalChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextGoals = event.target.value
      .split('\n')
      .map((goal) => goal.trim())
      .filter(Boolean)
    onUpdate({ goals: nextGoals })
  }

  return (
    <div className="split-panel">
      <div className="form-grid">
        <div className="field">
          <label>Intent Title</label>
          <input
            value={intent.title}
            onChange={(event) => onUpdate({ title: event.target.value })}
          />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea
            rows={3}
            value={intent.description}
            onChange={(event) => onUpdate({ description: event.target.value })}
          />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Goals (one per line)</label>
          <textarea
            rows={4}
            value={intent.goals.join('\n')}
            onChange={handleGoalChange}
          />
        </div>
      </div>
      <div>
        <div className="section-label">Open Questions</div>
        <div className="pattern-card">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {intent.openQuestions?.map((question) => (
              <li key={question} style={{ marginBottom: 6 }}>
                {question}
              </li>
            ))}
          </ul>
        </div>
        <div className="section-label" style={{ marginTop: 16 }}>
          Auto Fill Suggestions
        </div>
        <div className="pattern-card">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {intent.autoFill?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function PatternsTab({ intent }: TabProps) {
  return (
    <div className="pattern-list">
      {intent.patterns.map((config) => {
        const pattern = patternsById[config.id]
        return (
          <div key={config.id} className="pattern-card">
            <header>
              <div>
                <strong>{pattern?.name ?? config.id}</strong>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pattern?.summary}</div>
              </div>
              <span className="badge">{config.target ?? 'root'}</span>
            </header>
            <div className="section-label" style={{ marginTop: 12 }}>
              Params
            </div>
            <pre className="code-block" style={{ background: '#111827', color: '#e5e7eb' }}>
              {JSON.stringify(config.config, null, 2)}
            </pre>
          </div>
        )
      })}
    </div>
  )
}

function DomainTab({ intent }: TabProps) {
  const entity = intent.domain.entities?.[0]
  return (
    <div className="split-panel">
      <div>
        <div className="section-label">Entity Schema · {entity?.name}</div>
        <div className="pattern-card">
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {entity?.fields.map((field) => (
              <li key={field.name} style={{ marginBottom: 6 }}>
                <strong>{field.name}</strong> · {field.type}
                {field.values ? ` (${field.values.join(', ')})` : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <div className="section-label">APIs</div>
        <div className="pattern-list">
          {intent.domain.apis?.map((api) => (
            <div key={api.name} className="pattern-card">
              <header>
                <strong>{api.name}</strong>
                <span className="badge">{api.method}</span>
              </header>
              <small>{api.path}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BehaviorTab({ intent }: TabProps) {
  return (
    <div>
      <div className="section-label">Runtime Flows</div>
      <div className="flow-steps">
        {intent.runtimeFlows?.map((flow) => (
          <div key={flow.id} className="flow-step">
            <strong>{flow.id}</strong>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              trigger: {flow.trigger?.element} · {flow.trigger?.event}
            </div>
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              {flow.pipeline.map((step, idx) => (
                <li key={idx}>
                  call <code>{step.call}</code>
                  {step.as ? ` → as ${step.as}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function YamlTab({ intent }: TabProps) {
  return (
    <div className="yaml-preview">
      <pre>{YAML.stringify(intent)}</pre>
    </div>
  )
}

export function IntentTabs() {
  const intent = useIntentStore(
    (state) => state.drafts[state.selectedIntentId]
  )
  const selectedIntentId = useIntentStore((state) => state.selectedIntentId)
  const updateIntent = useIntentStore((state) => state.updateIntent)
  const [activeTab, setActiveTab] = useState('overview')

  if (!intent) return null

  const renderContent = () => {
    const tabProps: TabProps = {
      intent,
      onUpdate: (patch) => updateIntent(selectedIntentId, patch),
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab {...tabProps} />
      case 'patterns':
        return <PatternsTab {...tabProps} />
      case 'domain':
        return <DomainTab {...tabProps} />
      case 'behavior':
        return <BehaviorTab {...tabProps} />
      case 'yaml':
        return <YamlTab {...tabProps} />
      default:
        return null
    }
  }

  return (
    <div>
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={tab.id === activeTab ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {renderContent()}
    </div>
  )
}
