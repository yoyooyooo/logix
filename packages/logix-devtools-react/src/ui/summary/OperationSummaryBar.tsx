import React from "react"

import type { OperationSummary as DevtoolsOperationSummary } from "../../state/model.js"

export interface OperationSummaryBarProps {
  readonly summary?: DevtoolsOperationSummary
  readonly onClose?: () => void
}

const formatFieldPath = (path: string): string => {
  const parts = path.split(".")
  if (parts.length <= 3) return path
  return `${parts[0]}.…${parts[parts.length - 1]}`
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

  const trait = summary.traitConverge
  const hasTrait = Boolean(trait && trait.txnCount > 0)
  const hasDegraded = Boolean(trait && trait.outcomes.Degraded > 0)

  return (
    <div
      className="px-4 py-1.5 border-b flex items-center justify-between gap-3"
      style={{
        borderColor: "var(--dt-border)",
        backgroundColor: "var(--dt-bg-header)",
        color: "var(--dt-text-secondary)",
      }}
    >
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
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

        {hasTrait && trait && (
          <>
            <span
              style={{
                color: hasDegraded ? "var(--dt-warning)" : "var(--dt-text-secondary)",
              }}
              title={
                hasDegraded
                  ? `degraded=${trait.outcomes.Degraded} (budget_exceeded=${trait.degradedReasons.budget_exceeded}, runtime_error=${trait.degradedReasons.runtime_error})`
                  : undefined
              }
            >
              trait: {trait.txnCount} txns · cost: {Math.round(trait.totalDurationMs)}ms
            </span>
            {trait.top3.length > 0 && (
              <span
                style={{ color: "var(--dt-text-muted)" }}
                title={trait.top3.map((s) => `${s.kind}:${s.fieldPath} ${s.durationMs}ms`).join("\n")}
              >
                top3:{" "}
                {trait.top3
                  .map((s) => `${s.kind}:${formatFieldPath(s.fieldPath)} ${Math.round(s.durationMs)}ms`)
                  .join(", ")}
              </span>
            )}
          </>
        )}
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
