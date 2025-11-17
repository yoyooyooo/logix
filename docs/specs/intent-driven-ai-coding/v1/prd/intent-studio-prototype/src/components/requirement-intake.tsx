import { useMemo, useState } from 'react'
import { requirementCases } from '../data/requirements'
import type { RequirementId } from '../data/requirements'
import { intents as canonicalIntents } from '../data'
import { useIntentStore } from '../stores/use-intent-store'
import { usePlanSimulationContext } from '../contexts/plan-simulation-context'
import { useSessionStore } from '../stores/use-session-store'

const guessRequirement = (text: string) => {
  const lower = text.toLowerCase()
  if (!lower.trim()) return undefined
  const byTitle = requirementCases.find((req) => lower.includes(req.title.toLowerCase()))
  if (byTitle) return byTitle
  if (lower.includes('导出') && lower.includes('订单')) {
    return requirementCases.find((req) => req.id === 'order-export-demand')
  }
  if (lower.includes('工作台') || lower.includes('指派') || lower.includes('任务')) {
    return requirementCases.find((req) => req.id === 'ops-workbench-demand')
  }
  return undefined
}

export function RequirementIntake() {
  const selectIntent = useIntentStore((state) => state.selectIntent)
  const loadIntentSnapshot = useIntentStore((state) => state.loadIntentSnapshot)
  const markRequirementInput = useSessionStore((state) => state.setHasRequirementInput)
  const [documentText, setDocumentText] = useState('')
  const [selectedExample, setSelectedExample] = useState<RequirementId>(
    requirementCases[0]?.id ?? 'order-export-demand'
  )
  const [activeExample, setActiveExample] = useState<(typeof requirementCases)[number] | null>(null)
  const [llmOutput, setLlmOutput] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const { generatePlan } = usePlanSimulationContext()

  const highlightedExample = useMemo(
    () => activeExample ?? requirementCases.find((req) => req.id === selectedExample) ?? null,
    [activeExample, selectedExample]
  )

  const handleLoadExample = () => {
    const example = requirementCases.find((req) => req.id === selectedExample)
    if (!example) return
    setDocumentText(example.document ?? '')
    setActiveExample(example)
    setStatus('idle')
    setError(null)
    setLlmOutput([])
    markRequirementInput(true)
  }

  const handleChangeDocument = (value: string) => {
    setDocumentText(value)
    setActiveExample(null)
    setStatus('idle')
    setError(null)
    setLlmOutput([])
    markRequirementInput(Boolean(value.trim()))
  }

  const handleParse = () => {
    if (!documentText.trim()) {
      setError('请先粘贴需求文档或加载示例。')
      setStatus('error')
      return
    }
    setStatus('parsing')
    const matched = activeExample ?? guessRequirement(documentText)
    if (!matched?.readyIntentId) {
      setError('LLM 未能匹配到平台意图，请补充更具体的描述。')
      setStatus('error')
      return
    }
    setActiveExample(matched)
    const canonical = canonicalIntents.find((intent) => intent.id === matched.readyIntentId)
    if (!canonical) {
      setError('平台暂未收录该意图，请先在资产库创建。')
      setStatus('error')
      return
    }
    loadIntentSnapshot(canonical)
    selectIntent(canonical.id)
    setLlmOutput(matched.llmSummaryBullets ?? [])
    setStatus('ready')
    setError(null)
    setTimeout(() => {
      generatePlan()
    }, 0)
  }

  return (
    <section className="card" style={{ marginTop: 12 }}>
      <div className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>Step 1 · 粘贴需求</div>
      <h3>告诉平台你要做什么</h3>
      <p className="panel-desc">
        粘贴需求原文或一键加载示例，平台会调用 LLM 解析结构化意图，随后推送到 Pattern/Plan/Flow。
      </p>
      <div className="form-grid">
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>需求文档 / 会议纪要</label>
          <textarea
            rows={5}
            value={documentText}
            placeholder="粘贴真实需求……"
            onChange={(event) => handleChangeDocument(event.target.value)}
          />
        </div>
      </div>
      <div className="actions-row" style={{ marginTop: 12 }}>
        <div className="field" style={{ flex: '1 1 240px' }}>
          <label>示例需求（演示）</label>
          <select value={selectedExample} onChange={(event) => setSelectedExample(event.target.value as RequirementId)}>
            {requirementCases.map((req) => (
              <option key={req.id} value={req.id}>
                {req.title}
              </option>
            ))}
          </select>
        </div>
        <button className="secondary-button" onClick={handleLoadExample}>
          填充示例文档
        </button>
        <button className="primary-button" onClick={handleParse}>
          {status === 'parsing' ? 'LLM 解析中…' : '解析为意图并生成 Plan'}
        </button>
      </div>
      {error ? <div className="error-text">{error}</div> : null}
      {highlightedExample ? (
        <div className="pattern-card" style={{ marginTop: 16 }}>
          <strong>示例说明 · {highlightedExample.title}</strong>
          <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{highlightedExample.summary}</div>
          <div className="section-label" style={{ marginTop: 8 }}>痛点 / 约束</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {highlightedExample.painPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          {llmOutput.length ? (
            <div style={{ marginTop: 12 }}>
              <div className="section-label">LLM 输出（演示）</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {llmOutput.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
