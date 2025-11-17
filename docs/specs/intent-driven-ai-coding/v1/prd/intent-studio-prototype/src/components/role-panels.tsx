import { useState } from 'react'
import type { ReactNode } from 'react'
import { RoleSwitcher } from './role-switcher'
import { IntentTabs } from './intent-studio/intent-tabs'
import { PatternGallery } from './pattern-gallery'
import { TemplateExplorer } from './template-explorer'
import { PlanConsole } from './plan-console'
import { FlowSimulator } from './flow-simulator'
import { useSessionStore } from '../stores/use-session-store'
import { useIntentStore } from '../stores/use-intent-store'
import { PatternManager } from './pattern-manager'

interface PanelProps {
  children: ReactNode
}

function PanelContainer({ children }: PanelProps) {
  return <div className="role-panel">{children}</div>
}

export function RolePanels() {
  const [role, setRole] = useState('product')
  const hasRequirementInput = useSessionStore((state) => state.hasRequirementInput)
  const hasIntent = useIntentStore((state) => Boolean(state.selectedIntentId))
  const ready = hasRequirementInput || hasIntent

  if (!ready) {
    return (
      <section className="card">
        <div className="role-panel-header">
          <div>
            <div className="badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
              角色模式
            </div>
            <h2>待解析意图</h2>
            <p className="panel-desc">粘贴需求并解析后，这里会展示各角色关心的视图。</p>
          </div>
        </div>
        <div className="empty-state">暂无结构化意图，请先完成 Step 1。</div>
      </section>
    )
  }

  const renderPanel = () => {
    switch (role) {
      case 'product':
        return (
          <PanelContainer>
            <h3>需求视图</h3>
            <p className="panel-desc">适合产品/运营：聚焦意图、目标、场景。</p>
            <IntentTabs />
          </PanelContainer>
        )
      case 'engineer':
        return (
          <PanelContainer>
            <h3>工程视图</h3>
            <p className="panel-desc">选择/绑定模式 → 查看模板映射 → 生成 Plan。</p>
            <div className="panels-grid">
              <PatternManager />
              <TemplateExplorer />
            </div>
            <div className="panels-grid" style={{ marginTop: 16 }}>
              <PatternGallery />
              <PlanConsole />
            </div>
          </PanelContainer>
        )
      case 'runtime':
        return (
          <PanelContainer>
            <h3>运行时视图</h3>
            <p className="panel-desc">Flow DSL → Effect → Hook → 行为执行。</p>
            <FlowSimulator />
          </PanelContainer>
        )
      default:
        return null
    }
  }

  return (
    <section className="card">
      <div className="role-panel-header">
        <div>
          <div className="badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            角色模式
          </div>
          <h2>按角色切换信息密度</h2>
          <p className="panel-desc">不同角色关注各自任务，系统自动折叠无关内容。</p>
        </div>
        <RoleSwitcher value={role} onChange={setRole} />
      </div>
      {renderPanel()}
    </section>
  )
}
