import { start } from 'monaco-editor/esm/vs/editor/editor.worker.start.js'
import { create } from 'monaco-editor/esm/vs/language/typescript/tsWorker.js'
import { monacoTypeBundleFiles } from '../types/monacoTypeBundle.generated.js'

type ExtraLib = { readonly content: string; readonly version: number }

const toExtraLibs = (files: Readonly<Record<string, string>>): Record<string, ExtraLib> => {
  const libs: Record<string, ExtraLib> = {}
  let version = 1
  for (const [fileName, content] of Object.entries(files)) {
    libs[fileName] = { content, version }
    version += 1
  }
  return libs
}

const patchCompilerOptions = (compilerOptions: Record<string, unknown>): Record<string, unknown> => ({
  ...compilerOptions,
  target: 7,
  lib: ['lib.es2020.d.ts', 'lib.webworker.d.ts'],
  moduleResolution: 100,
  module: 99,
  noEmit: true,
  downlevelIteration: true,
  jsx: 4,
})

start((ctx: unknown) =>
  create(ctx, {
    extraLibs: toExtraLibs(monacoTypeBundleFiles),
    compilerOptions: patchCompilerOptions({}),
  }),
)
