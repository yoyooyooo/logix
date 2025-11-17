import { useIntentStore } from '../stores/use-intent-store'
import { usePlanSimulationContext } from '../contexts/plan-simulation-context'
import { useSessionStore } from '../stores/use-session-store'

export function CopilotBar() {
  const hasRequirementInput = useSessionStore((state) => state.hasRequirementInput)
  const currentIntent = useIntentStore((state) => state.drafts[state.selectedIntentId])
  const { plan, logs } = usePlanSimulationContext()
  const planReady = Boolean(plan && plan.actions.length)
  const steps = [
    {
      id: 'input',
      label: '输入需求',
      desc: hasRequirementInput ? '已接收需求文档' : '等待粘贴或加载示例',
      done: hasRequirementInput,
    },
    {
      id: 'intent',
      label: 'LLM 解析意图',
      desc: currentIntent ? currentIntent.title : '尚未解析意图',
      done: Boolean(currentIntent),
    },
    {
      id: 'plan',
      label: '生成 Plan / Flow',
      desc: planReady ? `Create-file × ${plan?.actions.length ?? 0}` : '点击解析后自动生成',
      done: planReady,
    },
  ]

  return (
    <section className="card" style={{ marginTop: 12 }}>
      <div className="copilot-strip">
        <div>
          <div className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            Copilot 进度
          </div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>意图驱动流水线</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Copilot 会在每个阶段提示“系统做了什么 / 你下一步做什么”。
          </div>
        </div>
        <div className="badge" style={{ background: '#eef2ff', color: '#4f46e5' }}>
          {planReady ? 'Plan Ready' : currentIntent ? 'Awaiting Plan' : 'Idle'}
        </div>
      </div>
      <div className="copilot-steps">
        {steps.map((step) => (
          <div key={step.id} className={`copilot-step ${step.done ? 'done' : 'pending'}`}>
            <div className="copilot-step-title">{step.label}</div>
            <div className="copilot-step-desc">{step.desc}</div>
            <div className="copilot-step-status">{step.done ? '完成' : '待处理'}</div>
          </div>
        ))}
      </div>
      {logs.length ? (
        <div className="console-window" style={{ marginTop: 16, height: 'auto' }}>
          <strong>最新日志</strong>
          <div>{logs[logs.length - 1]}</div>
        </div>
      ) : null}
    </section>
  )
}
