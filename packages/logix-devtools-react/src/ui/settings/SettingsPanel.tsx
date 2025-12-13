import React from "react"
import type { DevtoolsSettings } from "../../state.js"

export interface SettingsPanelProps {
  readonly settings: DevtoolsSettings
  readonly onUpdate: (partial: Partial<DevtoolsSettings>) => void
  readonly onClose: () => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdate,
  onClose,
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false)

  const updateNumber = (
    key: keyof DevtoolsSettings,
    value: string,
  ) => {
    const n = Number(value)
    if (Number.isNaN(n)) return
    onUpdate({ [key]: n } as any)
  }

  return (
    <div
      className="absolute top-10 right-2 w-[280px] p-3 rounded-lg border shadow-lg flex flex-col gap-2 text-[10px] font-mono"
      style={{
        backgroundColor: "var(--dt-bg-surface)",
        borderColor: "var(--dt-border)",
        color: "var(--dt-text-primary)",
        zIndex: 10,
      }}
      aria-label="DevtoolsSettingsPanel"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold">Settings</span>
        <button
          type="button"
          onClick={onClose}
          className="px-1.5 py-0.5 rounded border"
          style={{
            backgroundColor: "var(--dt-bg-element)",
            borderColor: "var(--dt-border-light)",
            color: "var(--dt-text-secondary)",
          }}
          aria-label="CloseSettingsPanel"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center justify-between gap-2">
          <span>mode</span>
          <select
            value={settings.mode}
            onChange={(e) =>
              onUpdate({ mode: e.target.value as any })
            }
            className="px-1 py-0.5 rounded border"
            style={{
              backgroundColor: "var(--dt-bg-root)",
              borderColor: "var(--dt-border)",
            }}
          >
            <option value="basic">basic</option>
            <option value="deep">deep</option>
          </select>
        </label>

        <label className="flex items-center justify-between gap-2">
          <span>showTraitEvents</span>
          <input
            type="checkbox"
            checked={settings.showTraitEvents}
            onChange={(e) =>
              onUpdate({ showTraitEvents: e.target.checked })
            }
          />
        </label>

        <label className="flex items-center justify-between gap-2">
          <span>showReactRenderEvents</span>
          <input
            type="checkbox"
            checked={settings.showReactRenderEvents}
            onChange={(e) =>
              onUpdate({ showReactRenderEvents: e.target.checked })
            }
          />
        </label>

        <label className="flex items-center justify-between gap-2">
          <span>enableTimeTravelUI</span>
          <input
            type="checkbox"
            checked={settings.enableTimeTravelUI}
            onChange={(e) =>
              onUpdate({ enableTimeTravelUI: e.target.checked })
            }
          />
        </label>

        <label className="flex items-center justify-between gap-2">
          <span>eventBufferSize</span>
          <input
            type="number"
            min={100}
            max={5000}
            value={settings.eventBufferSize}
            onChange={(e) =>
              updateNumber("eventBufferSize", e.target.value)
            }
            className="w-20 px-1 py-0.5 rounded border"
            style={{
              backgroundColor: "var(--dt-bg-root)",
              borderColor: "var(--dt-border)",
            }}
          />
        </label>

        <label className="flex items-center justify-between gap-2">
          <span>operationWindowMs</span>
          <input
            type="number"
            min={200}
            max={5000}
            value={settings.operationWindowMs}
            onChange={(e) =>
              updateNumber("operationWindowMs", e.target.value)
            }
            className="w-20 px-1 py-0.5 rounded border"
            style={{
              backgroundColor: "var(--dt-bg-root)",
              borderColor: "var(--dt-border)",
            }}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-left px-2 py-1 rounded border"
        style={{
          backgroundColor: "var(--dt-bg-element)",
          borderColor: "var(--dt-border-light)",
          color: "var(--dt-text-secondary)",
        }}
        aria-label="ToggleAdvancedSettings"
      >
        {showAdvanced ? "Hide advanced" : "Show advanced"}
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between gap-2">
            <span>overviewHighlightDurationMs</span>
            <input
              type="number"
              min={500}
              max={10000}
              value={settings.overviewHighlightDurationMs}
              onChange={(e) =>
                updateNumber("overviewHighlightDurationMs", e.target.value)
              }
              className="w-20 px-1 py-0.5 rounded border"
              style={{
                backgroundColor: "var(--dt-bg-root)",
                borderColor: "var(--dt-border)",
              }}
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span>txnPerSecondWarn</span>
            <input
              type="number"
              value={settings.overviewThresholds.txnPerSecondWarn}
              onChange={(e) =>
                onUpdate({
                  overviewThresholds: {
                    ...settings.overviewThresholds,
                    txnPerSecondWarn: Number(e.target.value),
                  },
                })
              }
              className="w-20 px-1 py-0.5 rounded border"
              style={{
                backgroundColor: "var(--dt-bg-root)",
                borderColor: "var(--dt-border)",
              }}
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span>txnPerSecondDanger</span>
            <input
              type="number"
              value={settings.overviewThresholds.txnPerSecondDanger}
              onChange={(e) =>
                onUpdate({
                  overviewThresholds: {
                    ...settings.overviewThresholds,
                    txnPerSecondDanger: Number(e.target.value),
                  },
                })
              }
              className="w-20 px-1 py-0.5 rounded border"
              style={{
                backgroundColor: "var(--dt-bg-root)",
                borderColor: "var(--dt-border)",
              }}
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span>renderPerTxnWarn</span>
            <input
              type="number"
              value={settings.overviewThresholds.renderPerTxnWarn}
              onChange={(e) =>
                onUpdate({
                  overviewThresholds: {
                    ...settings.overviewThresholds,
                    renderPerTxnWarn: Number(e.target.value),
                  },
                })
              }
              className="w-20 px-1 py-0.5 rounded border"
              style={{
                backgroundColor: "var(--dt-bg-root)",
                borderColor: "var(--dt-border)",
              }}
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span>renderPerTxnDanger</span>
            <input
              type="number"
              value={settings.overviewThresholds.renderPerTxnDanger}
              onChange={(e) =>
                onUpdate({
                  overviewThresholds: {
                    ...settings.overviewThresholds,
                    renderPerTxnDanger: Number(e.target.value),
                  },
                })
              }
              className="w-20 px-1 py-0.5 rounded border"
              style={{
                backgroundColor: "var(--dt-bg-root)",
                borderColor: "var(--dt-border)",
              }}
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span>reactRenderSampleRate</span>
            <input
              type="number"
              step={0.1}
              min={0}
              max={1}
              value={settings.sampling.reactRenderSampleRate}
              onChange={(e) =>
                onUpdate({
                  sampling: {
                    ...settings.sampling,
                    reactRenderSampleRate: Number(e.target.value),
                  },
                })
              }
              className="w-20 px-1 py-0.5 rounded border"
              style={{
                backgroundColor: "var(--dt-bg-root)",
                borderColor: "var(--dt-border)",
              }}
            />
          </label>
        </div>
      )}
    </div>
  )
}
