import type { Options, Plugin } from 'prettier'
import { toPrettierSourceLanguage } from './sourceFormatSupport.js'

interface PrettierBundle {
  readonly prettier: typeof import('prettier/standalone')
  readonly babelPlugin: Plugin
  readonly estreePlugin: Plugin
  readonly typescriptPlugin: Plugin
}

export interface FormatPlaygroundSourceInput {
  readonly value: string
  readonly language: string
  readonly path?: string
}

interface PrettierParserConfig {
  readonly parser: 'babel' | 'json' | 'typescript'
  readonly plugins: (bundle: PrettierBundle) => Plugin[]
}

let prettierBundlePromise: Promise<PrettierBundle> | undefined

const PRETTIER_BASE_OPTIONS = {
  printWidth: 100,
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
} satisfies Options

const resolveParserConfig = (language: string): PrettierParserConfig | undefined => {
  switch (toPrettierSourceLanguage(language)) {
    case 'typescript':
      return {
        parser: 'typescript',
        plugins: (bundle) => [bundle.typescriptPlugin, bundle.estreePlugin],
      }
    case 'javascript':
      return {
        parser: 'babel',
        plugins: (bundle) => [bundle.babelPlugin, bundle.estreePlugin],
      }
    case 'json':
      return {
        parser: 'json',
        plugins: (bundle) => [bundle.babelPlugin, bundle.estreePlugin],
      }
    default:
      return undefined
  }
}

const loadPrettierBundle = async (): Promise<PrettierBundle> => {
  if (prettierBundlePromise) return prettierBundlePromise
  prettierBundlePromise = (async () => {
    const [prettier, babelPlugin, estreePlugin, typescriptPlugin] = await Promise.all([
      import('prettier/standalone'),
      import('prettier/plugins/babel'),
      import('prettier/plugins/estree'),
      import('prettier/plugins/typescript'),
    ])
    return {
      prettier,
      babelPlugin,
      estreePlugin,
      typescriptPlugin,
    }
  })()
  return prettierBundlePromise
}

export const formatPlaygroundSource = async ({
  value,
  language,
  path,
}: FormatPlaygroundSourceInput): Promise<string> => {
  const parserConfig = resolveParserConfig(language)
  if (!parserConfig) return value

  const bundle = await loadPrettierBundle()
  return bundle.prettier.format(value, {
    ...PRETTIER_BASE_OPTIONS,
    filepath: path,
    parser: parserConfig.parser,
    plugins: parserConfig.plugins(bundle),
  })
}
