import { token, type I18nMessageToken } from '@logixjs/i18n'

export const REQUIRED_KEY = 'logix.form.rule.required'
export const EMAIL_KEY = 'logix.form.rule.email'
export const MIN_LENGTH_KEY = 'logix.form.rule.minLength'
export const MAX_LENGTH_KEY = 'logix.form.rule.maxLength'
export const MIN_KEY = 'logix.form.rule.min'
export const MAX_KEY = 'logix.form.rule.max'
export const PATTERN_KEY = 'logix.form.rule.pattern'
export const LITERAL_KEY = 'logix.form.rule.literal'

const LITERAL_SEGMENT_MAX_LEN = 96
const LITERAL_MAX_LEN = LITERAL_SEGMENT_MAX_LEN * 3

const literalSegments = (text: string): Readonly<{ readonly a: string; readonly b: string; readonly c: string }> => {
  if (text.length > LITERAL_MAX_LEN) {
    throw new Error(`[Form.validators] raw string builtin message must be ≤${LITERAL_MAX_LEN} chars before lowering`)
  }

  return {
    a: text.slice(0, LITERAL_SEGMENT_MAX_LEN),
    b: text.slice(LITERAL_SEGMENT_MAX_LEN, LITERAL_SEGMENT_MAX_LEN * 2),
    c: text.slice(LITERAL_SEGMENT_MAX_LEN * 2, LITERAL_SEGMENT_MAX_LEN * 3),
  }
}

export const requiredToken = (): I18nMessageToken => token(REQUIRED_KEY)
export const emailToken = (): I18nMessageToken => token(EMAIL_KEY)
export const minLengthToken = (min: number): I18nMessageToken => token(MIN_LENGTH_KEY, { min })
export const maxLengthToken = (max: number): I18nMessageToken => token(MAX_LENGTH_KEY, { max })
export const minToken = (min: number): I18nMessageToken => token(MIN_KEY, { min })
export const maxToken = (max: number): I18nMessageToken => token(MAX_KEY, { max })
export const patternToken = (): I18nMessageToken => token(PATTERN_KEY)
export const literalToken = (text: string): I18nMessageToken => token(LITERAL_KEY, literalSegments(text))
