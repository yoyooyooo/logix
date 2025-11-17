import React from 'react'
import { getInstanceLabel } from '../../snapshot/index.js'
import { useDevtoolsState, useDevtoolsDispatch } from '../hooks/DevtoolsHooks.js'

export const Sidebar: React.FC = () => {
  const state = useDevtoolsState()
  const dispatch = useDevtoolsDispatch()

  const { runtimes, selectedRuntime, selectedModule, selectedInstance } = state

  const [openInstanceModuleId, setOpenInstanceModuleId] = React.useState<string | null>(null)

  const activeRuntime = runtimes.find((r) => r.runtimeLabel === selectedRuntime)
  const modules = activeRuntime?.modules ?? []

  const handleSelectRuntime = (runtimeLabel: string) => dispatch({ _tag: 'selectRuntime', payload: runtimeLabel })
  const handleSelectModule = (moduleId: string) => dispatch({ _tag: 'selectModule', payload: moduleId })
  const handleSelectInstance = (instanceId: string) => dispatch({ _tag: 'selectInstance', payload: instanceId })

  return (
    <div
      className="w-64 h-full min-h-0 flex flex-col border-r backdrop-blur-sm"
      style={{
        backgroundColor: 'var(--dt-bg-surface)',
        borderColor: 'var(--dt-border)',
      }}
    >
      <div className="flex flex-col border-b" style={{ borderColor: 'var(--dt-border)' }}>
        <div
          className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--dt-text-muted)' }}
        >
          Runtimes
        </div>
        <div className="flex flex-col px-2 pb-2">
          {runtimes.length === 0 ? (
            <div className="px-2 py-1 text-xs italic" style={{ color: 'var(--dt-text-dim)' }}>
              No Active Runtimes
            </div>
          ) : (
            runtimes.map((r) => {
              const isSelected = r.runtimeLabel === selectedRuntime
              return (
                <button
                  key={r.runtimeLabel}
                  onClick={() => handleSelectRuntime(r.runtimeLabel)}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-all border"
                  style={{
                    backgroundColor: isSelected ? 'var(--dt-primary-bg)' : 'transparent',
                    color: isSelected ? 'var(--dt-primary)' : 'var(--dt-text-secondary)',
                    borderColor: isSelected ? 'var(--dt-primary-border)' : 'transparent',
                    boxShadow: isSelected ? '0 0 10px -3px var(--dt-primary-border)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: isSelected ? 'var(--dt-primary)' : 'var(--dt-text-muted)',
                      }}
                    />
                    <span className="truncate" title={r.runtimeLabel}>
                      {r.runtimeLabel}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <div
          className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider flex justify-between items-center"
          style={{ color: 'var(--dt-text-muted)' }}
        >
          <span>Modules</span>
          <span
            className="px-1.5 rounded text-[9px]"
            style={{ backgroundColor: 'var(--dt-bg-element)', color: 'var(--dt-text-secondary)' }}
          >
            {modules.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 overscroll-contain scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {!selectedRuntime ? (
            <div className="px-2 py-8 text-center text-xs" style={{ color: 'var(--dt-text-dim)' }}>
              Select a runtime
            </div>
          ) : modules.length === 0 ? (
            <div className="px-2 py-4 text-center text-xs italic" style={{ color: 'var(--dt-text-dim)' }}>
              No modules found
            </div>
          ) : (
            modules.map((m) => {
              const isSelected = m.moduleId === selectedModule
              return (
                <div key={m.moduleId} className="w-full">
                  <button
                    onClick={() => handleSelectModule(m.moduleId)}
                    className="w-full group flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors border"
                    style={{
                      backgroundColor: isSelected ? 'var(--dt-info-bg)' : 'transparent',
                      color: isSelected ? 'var(--dt-info)' : 'var(--dt-text-secondary)',
                      borderColor: isSelected ? 'var(--dt-info-border)' : 'transparent',
                    }}
                  >
                    <span className="truncate font-mono opacity-90" title={m.moduleId}>
                      {m.moduleId}
                    </span>
                    {m.count > 0 && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectModule(m.moduleId)
                          setOpenInstanceModuleId((prev) => (prev === m.moduleId ? null : m.moduleId))
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            handleSelectModule(m.moduleId)
                            setOpenInstanceModuleId((prev) => (prev === m.moduleId ? null : m.moduleId))
                          }
                        }}
                        className="text-[9px] px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: isSelected ? 'var(--dt-info-bg)' : 'var(--dt-bg-root)',
                          color: isSelected ? 'var(--dt-info)' : 'var(--dt-text-muted)',
                          borderColor: isSelected ? 'var(--dt-info-border)' : 'var(--dt-border)',
                        }}
                      >
                        {(() => {
                          let text: string
                          if (
                            m.moduleId === selectedModule &&
                            selectedInstance &&
                            m.instances.includes(selectedInstance)
                          ) {
                            const label = getInstanceLabel(selectedInstance) ?? selectedInstance
                            text = label.length > 18 ? `${label.slice(0, 15)}…` : label
                          } else {
                            text = `${m.count} inst`
                          }
                          return (
                            <span className="flex items-center gap-1">
                              <span>{text}</span>
                              {m.hasTraitBlueprint && (
                                <span
                                  className="inline-flex items-center px-1.5 rounded-full text-[8px] font-semibold"
                                  style={{
                                    backgroundColor: m.hasTraitRuntime ? 'var(--dt-state-bg)' : 'var(--dt-bg-root)',
                                    color: m.hasTraitRuntime ? 'var(--dt-state-dim)' : 'var(--dt-text-muted)',
                                    border: `1px solid ${m.hasTraitRuntime ? 'var(--dt-state)' : 'var(--dt-border)'}`,
                                  }}
                                >
                                  Trait
                                </span>
                              )}
                              <svg
                                className={`w-2.5 h-2.5 transition-transform ${
                                  openInstanceModuleId === m.moduleId ? 'rotate-180' : 'rotate-0'
                                }`}
                                viewBox="0 0 12 12"
                                aria-hidden="true"
                              >
                                <path
                                  d="M3 4.5L6 7.5L9 4.5"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          )
                        })()}
                      </span>
                    )}
                  </button>

                  {m.moduleId === selectedModule && openInstanceModuleId === m.moduleId && m.instances.length > 0 && (
                    <div className="mt-1 pl-3 pr-1 flex flex-wrap gap-1.5">
                      {m.instances.map((id, idx) => {
                        const label = getInstanceLabel(id) ?? `Instance #${idx + 1}`
                        const isActive = id === selectedInstance
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => handleSelectInstance(id)}
                            title={label === id ? undefined : id}
                            className="px-2 py-0.5 rounded text-[10px] font-mono border transition-colors"
                            style={{
                              backgroundColor: isActive ? 'var(--dt-state-bg)' : 'var(--dt-bg-root)',
                              color: isActive ? 'var(--dt-state-dim)' : 'var(--dt-text-secondary)',
                              borderColor: isActive ? 'var(--dt-state)' : 'var(--dt-border)',
                              boxShadow: isActive ? '0 0 8px -3px var(--dt-state)' : 'none',
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
