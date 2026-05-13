// Public barrel for @logixjs/i18n
// Recommended usage:
//   import * as I18n from "@logixjs/i18n"
// Then I18n exposes only the service-first root surface and token contract.

export { I18n, I18nTag } from './internal/driver/i18n.js'
export type { I18nMessageToken, I18nTokenParams, I18nTokenParamsInput } from './internal/token/token.js'
export { token } from './internal/token/token.js'
