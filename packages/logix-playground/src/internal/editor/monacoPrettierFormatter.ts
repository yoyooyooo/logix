import type * as MonacoTypes from 'monaco-editor'
import { formatPlaygroundSource } from './prettierSourceFormatter.js'
import { isPrettierFormatSupported } from './sourceFormatSupport.js'

const PRETTIER_MONACO_LANGUAGES = ['typescript', 'javascript', 'json'] as const

let prettierFormatterRegistered = false

export const registerPrettierDocumentFormatter = (monaco: typeof MonacoTypes): void => {
  if (prettierFormatterRegistered) return
  prettierFormatterRegistered = true

  for (const language of PRETTIER_MONACO_LANGUAGES) {
    monaco.languages.registerDocumentFormattingEditProvider(language, {
      displayName: 'Prettier',
      async provideDocumentFormattingEdits(model) {
        const modelLanguage = model.getLanguageId()
        if (!isPrettierFormatSupported(modelLanguage)) return []

        const currentValue = model.getValue()
        const formatted = await formatPlaygroundSource({
          value: currentValue,
          language: modelLanguage,
          path: model.uri.path,
        })
        if (formatted === currentValue) return []

        return [{ range: model.getFullModelRange(), text: formatted }]
      },
    })
  }
}
