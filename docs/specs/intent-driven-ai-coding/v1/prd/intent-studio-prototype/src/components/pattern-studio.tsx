import { useState } from 'react'
import { usePatternStore } from '../stores/use-pattern-store'
import { PatternForm } from './pattern-form'
import { PatternIntentReference } from './pattern-intent-reference'
import { PatternNavTabs } from './pattern-nav-tabs'
import { PatternEditorSections } from './pattern-editor-sections'
import { PatternRuntimeSection } from './pattern-runtime-section'

export function PatternStudio({ patternId }: { patternId?: string }) {
  const pattern = usePatternStore((state) => (patternId ? state.drafts[patternId] : undefined))
  const createDraft = usePatternStore((state) => state.createDraft)
  const saveDraft = usePatternStore((state) => state.saveDraft)
  const publishPattern = usePatternStore((state) => state.publishPattern)
  const [activeTab, setActiveTab] = useState('base')

  if (!patternId) {
    return (
      <section className="card">
        <div className="empty-state">请选择或创建模式。</div>
        <button className="primary-button" onClick={createDraft}>新建模式草稿</button>
      </section>
    )
  }

  if (!pattern) {
    return (
      <section className="card">
        <div className="empty-state">未找到模式 {patternId}。</div>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="badge" style={{ background: '#ecfccb', color: '#4d7c0f' }}>Pattern Studio</div>
      <h2>维护模式 · {pattern.name}</h2>
      <PatternNavTabs
        tabs={[
          { id: 'base', label: '基础信息' },
          { id: 'roles', label: '角色/参数' },
          { id: 'runtime', label: 'UI & Runtime' },
          { id: 'references', label: '引用' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />
      {activeTab === 'base' ? <PatternForm pattern={pattern} /> : null}
      {activeTab === 'roles' ? <PatternEditorSections pattern={pattern} /> : null}
      {activeTab === 'runtime' ? <PatternRuntimeSection pattern={pattern} /> : null}
      {activeTab === 'references' ? (
        <div style={{ marginTop: 24 }}>
          <h4>引用此模式的意图</h4>
          <PatternIntentReference patternId={pattern.id} />
        </div>
      ) : null}
      <div className="actions-row" style={{ marginTop: 16 }}>
        <button className="primary-button" onClick={() => saveDraft(pattern.id)}>
          保存草稿
        </button>
        <button className="secondary-button" onClick={() => publishPattern(pattern.id)}>
          发布
        </button>
      </div>
    </section>
  )
}
