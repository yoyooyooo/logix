export type PlaygroundLocale = 'en' | 'cn'

export type PlaygroundText = {
  readonly run: string
  readonly running: string
  readonly cancel: string
  readonly reset: string
  readonly status: string
  readonly result: string
  readonly console: string
  readonly trace: string
  readonly error: string
  readonly durationMs: (ms: number) => string
  readonly noResult: string
}

const en: PlaygroundText = {
  run: 'Run',
  running: 'Running…',
  cancel: 'Cancel',
  reset: 'Reset',
  status: 'Status',
  result: 'Result',
  console: 'Console',
  trace: 'Trace',
  error: 'Error',
  durationMs: (ms) => `Duration: ${ms}ms`,
  noResult: 'No result yet.',
}

const cn: PlaygroundText = {
  run: '运行',
  running: '运行中…',
  cancel: '取消',
  reset: '重置',
  status: '状态',
  result: '结果',
  console: '控制台',
  trace: 'Trace',
  error: '错误',
  durationMs: (ms) => `耗时：${ms}ms`,
  noResult: '尚无结果。',
}

export const getPlaygroundText = (locale: string | undefined): PlaygroundText => (locale === 'cn' ? cn : en)
