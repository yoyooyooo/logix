import React from 'react'

export const formatPrettyJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`

export const copyToClipboard = async (text: string): Promise<void> => {
  if (typeof navigator === 'undefined') {
    throw new Error('navigator is undefined')
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!ok) {
    throw new Error('copy failed')
  }
}

export const JsonPanel: React.FC<{
  readonly title: string
  readonly value: unknown
  readonly maxHeightClassName?: string
}> = ({ title, value, maxHeightClassName }) => {
  const [copyState, setCopyState] = React.useState<'idle' | 'ok' | 'fail'>('idle')

  const jsonText = React.useMemo(() => formatPrettyJson(value), [value])

  const onCopy = React.useCallback(() => {
    setCopyState('idle')
    copyToClipboard(jsonText)
      .then(() => setCopyState('ok'))
      .catch(() => setCopyState('fail'))
      .finally(() => {
        window.setTimeout(() => setCopyState('idle'), 1200)
      })
  }, [jsonText])

  return (
    <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{title}</div>
        <button
          type="button"
          onClick={onCopy}
          className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {copyState === 'ok' ? '已复制' : copyState === 'fail' ? '复制失败' : '复制 JSON'}
        </button>
      </div>
      <pre className={`text-xs p-4 overflow-auto ${maxHeightClassName ?? 'max-h-[55vh]'}`}>{jsonText}</pre>
    </div>
  )
}

export const ErrorBanner: React.FC<{ readonly title: string; readonly detail: string }> = ({ title, detail }) => (
  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 text-sm">
    <div className="font-semibold text-red-700 dark:text-red-300">{title}</div>
    <div className="mt-1 text-red-700/80 dark:text-red-300/80 font-mono break-words">{detail}</div>
  </div>
)

