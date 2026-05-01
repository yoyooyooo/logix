import { fireEvent, render, screen } from '@testing-library/react'
import type * as MonacoTypes from 'monaco-editor'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { toMonacoFileUri, MonacoSourceEditor } from './MonacoSourceEditor.js'
import { registerPrettierDocumentFormatter } from './monacoPrettierFormatter.js'
import { getPlaygroundTypeScriptCompilerOptions } from './monacoTypeScriptOptions.js'

describe('MonacoSourceEditor', () => {
  it('maps virtual source paths to stable file URIs', () => {
    expect(toMonacoFileUri('/src/main.program.ts')).toBe('file:///src/main.program.ts')
    expect(toMonacoFileUri('src/services/search.service.ts')).toBe('file:///src/services/search.service.ts')
    expect(toMonacoFileUri('file:///src/logic/counter.logic.ts')).toBe('file:///src/logic/counter.logic.ts')
  })

  it('falls back to textarea with bounded editor status when Monaco is disabled', () => {
    const changes: string[] = []
    const source = ['export const main = () => 1', 'export const next = () => 2'].join('\n')

    render(
      <MonacoSourceEditor
        path="/src/main.program.ts"
        language="ts"
        value={source}
        files={[
          { path: '/src/main.program.ts', language: 'ts', content: source },
          { path: '/src/logic/counter.logic.ts', language: 'ts', content: 'export const counterStep = 1' },
        ]}
        onChange={(value) => changes.push(value)}
        preferMonaco={false}
      />,
    )

    expect(screen.getByRole('status').textContent).toContain('textarea fallback')
    const fallbackGutter = screen.getByTestId('monaco-source-editor-fallback-gutter')
    expect(fallbackGutter.textContent).toContain('1')
    expect(fallbackGutter.textContent).toContain('2')
    expect(screen.getByTestId('monaco-source-editor-fallback-surface').getAttribute('data-editor-stable-gutter')).toBe(
      'true',
    )
    const editor = screen.getByLabelText('Source editor')
    fireEvent.change(editor, { target: { value: 'export const main = () => 2' } })

    expect(changes).toEqual(['export const main = () => 2'])
  })

  it('ships local extraLib package metadata for approved Playground dependencies', async () => {
    const { monacoTypeBundleMeta } = await import('./types/monacoTypeBundle.generated.js')
    const packageNames = monacoTypeBundleMeta.packages.map((pkg) => pkg.name)

    expect(monacoTypeBundleMeta.generatedAt).not.toBe('static-stub')
    expect(monacoTypeBundleMeta.stats.filesCount).toBeGreaterThan(1)
    expect(packageNames).toEqual(
      expect.arrayContaining([
        '@logixjs/core',
        '@logixjs/react',
        '@logixjs/sandbox',
        '@logixjs/form',
        '@types/react',
        'effect',
      ]),
    )
  }, 10_000)

  it('includes bounded ambient declarations for current Logic-first example imports', async () => {
    const { monacoTypeBundleFiles } = await import('./types/monacoTypeBundle.generated.js')
    const prelude = monacoTypeBundleFiles['file:///__logix_playground_prelude__.d.ts']

    expect(prelude).toContain('namespace Module')
    expect(prelude).toContain('namespace Reducer')
    expect(prelude).toContain('namespace Runtime')
    expect(prelude).toContain('ProgramRunContext')
    expect(prelude).toContain('namespace Effect')
    expect(prelude).toContain('namespace Schema')
  })

  it('keeps package build free from local worker query imports', () => {
    const source = readFileSync(join(process.cwd(), 'src/internal/editor/monacoWorkers.ts'), 'utf8')

    expect(source).not.toContain('./workers/ts.worker?worker')
    expect(source).toContain('monaco-editor/esm/vs/language/typescript/ts.worker?worker')
  })

  it('configures Monaco TypeScript for package and virtual-source module resolution', () => {
    const options = getPlaygroundTypeScriptCompilerOptions({
      ModuleKind: { ESNext: 99 },
      ModuleResolutionKind: { NodeJs: 2 },
      ScriptTarget: { ESNext: 99 },
      JsxEmit: { ReactJSX: 4 },
    })

    expect(options.moduleResolution).toBe(2)
    expect(options.baseUrl).toBe('file:///')
    expect(options.paths).toMatchObject({
      '@logixjs/core': ['node_modules/@logixjs/core/dist/index.d.ts'],
      '@logixjs/core/*': ['node_modules/@logixjs/core/dist/*'],
      effect: ['node_modules/effect/dist/index.d.ts'],
      'effect/*': ['node_modules/effect/dist/*'],
      './*': ['./*'],
    })
    expect(options.noEmit).toBe(true)
    expect(options.jsx).toBe(4)
    expect(options.lib).toEqual(['lib.es2020.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'])
  })

  it('registers Prettier as Monaco document formatter for source languages', async () => {
    const providers = new Map<string, MonacoTypes.languages.DocumentFormattingEditProvider>()
    const monaco = {
      languages: {
        registerDocumentFormattingEditProvider(
          language: string,
          provider: MonacoTypes.languages.DocumentFormattingEditProvider,
        ) {
          providers.set(language, provider)
          return { dispose() {} }
        },
      },
    } as unknown as typeof MonacoTypes

    registerPrettierDocumentFormatter(monaco)

    expect(Array.from(providers.keys())).toEqual(['typescript', 'javascript', 'json'])
    const edits = await providers.get('typescript')?.provideDocumentFormattingEdits(
      {
        getLanguageId: () => 'typescript',
        getValue: () => 'export   const value={foo:"bar"}',
        getFullModelRange: () => ({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 34 }),
        uri: { path: '/src/main.program.ts' },
      } as unknown as MonacoTypes.editor.ITextModel,
      { insertSpaces: true, tabSize: 2 },
      {} as MonacoTypes.CancellationToken,
    )

    expect(edits).toEqual([
      {
        range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 34 },
        text: "export const value = { foo: 'bar' }\n",
      },
    ])
  })
})
