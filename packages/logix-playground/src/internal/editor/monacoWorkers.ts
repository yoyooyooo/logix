// oxlint-disable-next-line typescript-eslint/triple-slash-reference
/// <reference path="./monaco-env.d.ts" />

import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

let installed = false

export const ensureMonacoWorkers = (): void => {
  if (installed) return
  installed = true

  ;(globalThis as unknown as { MonacoEnvironment?: { getWorker: (_: unknown, label: string) => Worker } }).MonacoEnvironment = {
    getWorker: (_: unknown, label: string) => {
      if (label === 'json') return new JsonWorker()
      if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker()
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker()
      if (label === 'typescript' || label === 'javascript') return new TsWorker()
      return new EditorWorker()
    },
  }
}
