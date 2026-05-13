export type PrettierSourceLanguage = 'javascript' | 'json' | 'typescript'

export const toPrettierSourceLanguage = (language: string): PrettierSourceLanguage | undefined => {
  if (language === 'ts' || language === 'tsx' || language === 'typescript') return 'typescript'
  if (language === 'js' || language === 'jsx' || language === 'javascript') return 'javascript'
  if (language === 'json') return 'json'
  return undefined
}

export const isPrettierFormatSupported = (language: string): boolean => toPrettierSourceLanguage(language) !== undefined
