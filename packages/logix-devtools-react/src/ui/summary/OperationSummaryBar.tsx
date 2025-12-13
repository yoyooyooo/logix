import React from "react"

export interface OperationSummary {
  readonly startedAt: number
  readonly endedAt: number
  readonly durationMs: number
  readonly eventCount: number
  readonly renderCount: number
  readonly txnCount: number
}

export interface OperationSummaryBarProps {
  readonly summary?: OperationSummary
  readonly onClose?: () => void
}

/**
 * OperationSummaryBar：
 * - 顶部固定信息条，展示最近一次“操作窗口”摘要；
 * - 受控组件，是否展示由上层决定；
 * - 默认不自动消失，由下一次操作覆盖或用户手动关闭。
 */
export const OperationSummaryBar: React.FC<OperationSummaryBarProps> = ({
  summary,
  onClose,
}) => {
  if (!summary) return null

  return (
    <div
      className="px-4 py-1.5 border-b flex items-center justify-between gap-3"
      style={{
        borderColor: "var(--dt-border)",
        backgroundColor: "var(--dt-bg-header)",
        color: "var(--dt-text-secondary)",
      }}
    >
      <div className="flex items-center gap-3 text-[10px] font-mono">
        <span
          className="uppercase tracking-wider"
          style={{ color: "var(--dt-text-muted)" }}
        >
          Last Operation
        </span>
        <span>events: {summary.eventCount}</span>
        <span>txns: {summary.txnCount}</span>
        <span>renders: {summary.renderCount}</span>
        <span>duration: {summary.durationMs}ms</span>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] px-1.5 py-0.5 rounded border transition-colors"
          style={{
            backgroundColor: "var(--dt-bg-element)",
            color: "var(--dt-text-muted)",
            borderColor: "var(--dt-border-light)",
          }}
          aria-label="CloseOperationSummary"
          title="Hide"
        >
          ×
        </button>
      )}
    </div>
  )
}
