import React from 'react'
import { Schema } from 'effect'

export const JsonCard: React.FC<{ readonly title: string; readonly value: unknown }> = ({ title, value }) => (
  <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <div className="text-sm font-semibold text-gray-900 dark:text-white">{title}</div>
    </div>
    <pre className="p-4 text-[11px] leading-relaxed overflow-auto text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-950/30">
      {JSON.stringify(value, null, 2)}
    </pre>
  </div>
)

export const SectionTitle: React.FC<{ readonly title: string; readonly desc?: string }> = ({ title, desc }) => (
  <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
    {desc ? <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">{desc}</p> : null}
  </div>
)

export const TextField: React.FC<{
  readonly label: string
  readonly value: unknown
  readonly error?: unknown
  readonly touched?: boolean
  readonly dirty?: boolean
  readonly onChange: (next: string) => void
  readonly onBlur?: () => void
  readonly placeholder?: string
}> = ({ label, value, error, touched, dirty, onChange, onBlur, placeholder }) => (
  <label className="block text-sm text-gray-700 dark:text-gray-200">
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="text-[10px] font-mono text-gray-400">
        touched:{String(!!touched)} dirty:{String(!!dirty)}
      </span>
    </div>
    <input
      value={typeof value === 'string' ? value : ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
    />
    {touched && error ? <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{String(error)}</div> : null}
  </label>
)

export const NumberField: React.FC<{
  readonly label: string
  readonly value: unknown
  readonly error?: unknown
  readonly touched?: boolean
  readonly dirty?: boolean
  readonly onChange: (next: number) => void
  readonly onBlur?: () => void
}> = ({ label, value, error, touched, dirty, onChange, onBlur }) => (
  <label className="block text-sm text-gray-700 dark:text-gray-200">
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="text-[10px] font-mono text-gray-400">
        touched:{String(!!touched)} dirty:{String(!!dirty)}
      </span>
    </div>
    <input
      type="number"
      value={typeof value === 'number' && Number.isFinite(value) ? String(value) : '0'}
      onChange={(e) => {
        const raw = e.target.value
        const num = raw === '' ? 0 : Number(raw)
        if (!Number.isFinite(num)) return
        onChange(num)
      }}
      onBlur={onBlur}
      className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
    />
    {touched && error ? <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{String(error)}</div> : null}
  </label>
)

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...props }) => (
  <button
    {...props}
    className={[
      'px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50',
      className ?? '',
    ].join(' ')}
  />
)

export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...props }) => (
  <button
    {...props}
    className={[
      'px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50',
      className ?? '',
    ].join(' ')}
  />
)

export const ResourceSnapshotSchema = <DataSchema extends Schema.Schema<any, any>>(data: DataSchema) =>
  Schema.Struct({
    status: Schema.String,
    keyHash: Schema.optional(Schema.String),
    data: Schema.optional(data),
    error: Schema.optional(Schema.Any),
  })
