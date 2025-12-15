import React from 'react'
import * as Logix from '@logix/core'

export interface StateTraitGraphViewProps {
  /**
   * 来自 Debug.getModuleTraits(module) 的 Program 输出。
   * - 若未提供，则组件仅渲染占位提示。
   */
  readonly program?: Logix.StateTrait.StateTraitProgram<any>
  /**
   * 可选：当用户点击某个字段节点时通知调用方，
   * 调用方可以据此联动 EffectOp 时间线（例如按 fieldPath 过滤）。
   */
  readonly onSelectNode?: (fieldPath: string) => void
  /**
   * 可选：当前选中的字段路径，用于在 Graph 中高亮对应节点。
   */
  readonly selectedFieldPath?: string
}

export const StateTraitGraphView: React.FC<StateTraitGraphViewProps> = ({
  program,
  onSelectNode,
  selectedFieldPath,
}) => {
  if (!program) {
    return (
      <div
        className="text-xs px-3 py-2"
        style={{
          color: 'var(--dt-text-muted)',
          backgroundColor: 'var(--dt-bg-surface)',
        }}
      >
        No StateTraitProgram available for this module.
      </div>
    )
  }

  const { graph } = program

  return (
    <div
      className="text-[10px] font-mono px-3 py-2 space-y-2 overflow-auto"
      style={{
        backgroundColor: 'var(--dt-bg-surface)',
        color: 'var(--dt-text-primary)',
      }}
    >
      <div
        className="text-[9px] uppercase tracking-wide mb-1"
        style={{ color: 'var(--dt-text-muted)' }}
      >
        StateTraitGraph
      </div>

      <div>
        <div className="text-[9px] mb-1" style={{ color: 'var(--dt-text-secondary)' }}>
          Nodes ({graph.nodes.length})
        </div>
        <ul className="space-y-0.5">
          {graph.nodes.map((node) => {
            const fieldPath = node.field.path

            const label = node.meta?.label
            const tags = node.meta?.tags ?? []

            const handleClick = () => {
              if (onSelectNode) {
                onSelectNode(fieldPath)
              }
            }

            return (
              <li key={node.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleClick}
                  className="flex-1 flex items-center justify-between gap-2 text-left hover:bg-[var(--dt-bg-element)] rounded px-1 py-0.5 transition-colors"
                  style={
                    selectedFieldPath === fieldPath
                      ? {
                          backgroundColor: 'var(--dt-info-bg)',
                          boxShadow: '0 0 0 1px var(--dt-info)',
                        }
                      : undefined
                  }
                >
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate">{label ?? fieldPath}</span>
                    {label ? (
                      <span className="text-[9px] truncate" style={{ color: 'var(--dt-text-muted)' }}>
                        {fieldPath}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[9px]" style={{ color: 'var(--dt-text-muted)' }}>
                    {node.traits.map((t) => t.kind).join(', ') || '—'}
                    {tags.length > 0 ? ` · #${tags.join(' #')}` : ''}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div>
        <div className="text-[9px] mt-2 mb-1" style={{ color: 'var(--dt-text-secondary)' }}>
          Resources ({graph.resources.length})
        </div>
        <ul className="space-y-0.5">
          {graph.resources.map((res) => {
            const label = res.meta?.label
            const tags = res.meta?.tags ?? []
            const conflicts = res.metaConflicts ?? []

            return (
              <li key={res.resourceId} className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate">
                  {res.resourceId}
                  {label ? ` · ${label}` : ''}
                </span>
                <span className="text-[9px] flex items-center gap-2" style={{ color: 'var(--dt-text-muted)' }}>
                  <span>
                    owners:{' '}
                    {res.ownerFields.length}
                  </span>
                  {tags.length > 0 ? <span>#{tags.join(' #')}</span> : null}
                  {conflicts.length > 0 ? (
                    <span
                      className="px-1 rounded"
                      style={{
                        color: 'var(--dt-danger)',
                        backgroundColor: 'var(--dt-danger-bg)',
                        boxShadow: '0 0 0 1px var(--dt-danger-border)',
                      }}
                      title="Multiple conflicting meta declarations detected for this resource id."
                    >
                      meta-conflict+{conflicts.length}
                    </span>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div>
        <div className="text-[9px] mt-2 mb-1" style={{ color: 'var(--dt-text-secondary)' }}>
          Edges ({graph.edges.length})
        </div>
        <ul className="space-y-0.5">
          {graph.edges.map((edge) => (
            <li key={edge.id} className="flex items-center justify-between gap-2">
              <span>
                {edge.from} → {edge.to}
              </span>
              <span className="text-[9px]" style={{ color: 'var(--dt-text-muted)' }}>
                {edge.kind}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
