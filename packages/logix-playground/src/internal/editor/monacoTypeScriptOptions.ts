type MonacoCompilerOptionValue =
  | string
  | number
  | boolean
  | ReadonlyArray<string>
  | Readonly<Record<string, ReadonlyArray<string>>>
  | null
  | undefined

export type MonacoCompilerOptions = Readonly<Record<string, MonacoCompilerOptionValue>>

export type MonacoTypeScriptDefaults = {
  readonly addExtraLib: (content: string, filePath?: string) => unknown
  readonly setCompilerOptions: (options: MonacoCompilerOptions) => void
  readonly setEagerModelSync: (value: boolean) => void
}

export type MonacoTypeScriptLanguageNamespace = {
  readonly JsxEmit: { readonly ReactJSX: number }
  readonly ModuleKind: { readonly ESNext: number }
  readonly ModuleResolutionKind: { readonly NodeJs: number }
  readonly ScriptTarget: { readonly ESNext: number }
  readonly typescriptDefaults: MonacoTypeScriptDefaults
  readonly javascriptDefaults: MonacoTypeScriptDefaults
}

export const getPlaygroundTypeScriptCompilerOptions = (
  typescript: Pick<MonacoTypeScriptLanguageNamespace, 'JsxEmit' | 'ModuleKind' | 'ModuleResolutionKind' | 'ScriptTarget'>,
): MonacoCompilerOptions => ({
  allowSyntheticDefaultImports: true,
  baseUrl: 'file:///',
  esModuleInterop: true,
  forceConsistentCasingInFileNames: true,
  jsx: typescript.JsxEmit.ReactJSX,
  lib: ['lib.es2020.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  module: typescript.ModuleKind.ESNext,
  moduleResolution: typescript.ModuleResolutionKind.NodeJs,
  noEmit: true,
  skipLibCheck: true,
  target: typescript.ScriptTarget.ESNext,
  typeRoots: ['node_modules/@types'],
  paths: {
    '@logixjs/core': ['node_modules/@logixjs/core/dist/index.d.ts'],
    '@logixjs/core/*': ['node_modules/@logixjs/core/dist/*'],
    '@logixjs/react': ['node_modules/@logixjs/react/dist/index.d.ts'],
    '@logixjs/react/*': ['node_modules/@logixjs/react/dist/*'],
    '@logixjs/sandbox': ['node_modules/@logixjs/sandbox/dist/index.d.ts'],
    '@logixjs/sandbox/*': ['node_modules/@logixjs/sandbox/dist/*'],
    effect: ['node_modules/effect/dist/index.d.ts'],
    'effect/*': ['node_modules/effect/dist/*'],
    react: ['node_modules/@types/react/index.d.ts'],
    'react/*': ['node_modules/@types/react/*'],
    'react-dom': ['node_modules/@types/react-dom/index.d.ts'],
    'react-dom/*': ['node_modules/@types/react-dom/*'],
    './*': ['./*'],
    '../*': ['../*'],
  },
})
