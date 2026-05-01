import React from 'react'
import type { InteractionDriver } from '../driver/driverModel.js'

export interface DriverPanelProps {
  readonly drivers: ReadonlyArray<InteractionDriver>
  readonly availableActionTags?: ReadonlySet<string>
  readonly disabled?: boolean
  readonly onRunDriver: (driver: InteractionDriver, exampleId?: string) => void
}

export function DriverPanel({
  drivers,
  availableActionTags,
  disabled = false,
  onRunDriver,
}: DriverPanelProps): React.ReactElement | null {
  if (drivers.length === 0) return null

  return (
    <section
      aria-label="Drivers"
      className="rounded-md border border-gray-200 bg-white text-gray-800 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-2">
        <div className="min-w-0">
          <h2 className="text-xs font-medium">Drivers</h2>
          <p className="mt-0.5 truncate text-[11px] text-gray-500">curated product interactions</p>
        </div>
        <span className="rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500">
          {drivers.length}
        </span>
      </div>
      <div className="space-y-2 p-3">
        {drivers.map((driver) => {
          const actionUnavailable = availableActionTags ? !availableActionTags.has(driver.actionTag) : false
          const runDisabled = disabled || actionUnavailable
          return (
          <div key={driver.id} className="rounded-md border border-gray-100 bg-white px-3 py-2 hover:bg-gray-50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{driver.label}</p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-gray-500">{driver.actionTag}</p>
                {actionUnavailable ? (
                  <p className="mt-1 text-[11px] text-amber-700">Unavailable action</p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={runDisabled}
                aria-label={`Run driver ${driver.label}`}
                onClick={() => onRunDriver(driver)}
                className="rounded-md border border-transparent px-2.5 py-1 text-xs font-medium text-blue-600 hover:border-blue-100 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Run
              </button>
            </div>
            {driver.description ? (
              <p className="mt-2 text-xs text-gray-500">{driver.description}</p>
            ) : null}
            {driver.readAnchors?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {driver.readAnchors.map((anchor) => (
                  <span key={anchor.id} className="rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500">
                    {anchor.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )})}
      </div>
    </section>
  )
}
