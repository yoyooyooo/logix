import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import TsWorker from './workers/ts.worker?worker'

let installed = false

const instrumentWorker = (worker: Worker, label: string): Worker => {
  if (!import.meta.env.DEV) return worker

  worker.addEventListener('error', (event: any) => {
    const details = {
      message: event?.message,
      filename: event?.filename,
      lineno: event?.lineno,
      colno: event?.colno,
      error: event?.error,
    }
    console.error(`[MonacoWorker][${label}] error`, details)
  })

  worker.addEventListener('messageerror', (event: any) => {
    console.error(`[MonacoWorker][${label}] messageerror`, event)
  })

  return worker
}

export const ensureMonacoWorkers = (): void => {
  if (installed) return
  installed = true

  ;(globalThis as any).MonacoEnvironment = {
    getWorker(_: unknown, label: string) {
      if (label === 'json') return instrumentWorker(new JsonWorker(), label)
      if (label === 'css' || label === 'scss' || label === 'less') return instrumentWorker(new CssWorker(), label)
      if (label === 'html' || label === 'handlebars' || label === 'razor')
        return instrumentWorker(new HtmlWorker(), label)
      if (label === 'typescript' || label === 'javascript') return instrumentWorker(new TsWorker(), label)
      return instrumentWorker(new EditorWorker(), label)
    },
  }
}
