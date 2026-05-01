import {
  EMAIL_KEY,
  LITERAL_KEY,
  MAX_KEY,
  MAX_LENGTH_KEY,
  MIN_KEY,
  MIN_LENGTH_KEY,
  PATTERN_KEY,
  REQUIRED_KEY,
} from '../internal/validators/builtinMessageTokens.js'

export const zhCN = {
  [REQUIRED_KEY]: '此项为必填',
  [EMAIL_KEY]: '邮箱格式不正确',
  [MIN_LENGTH_KEY]: '长度不能小于 {{min}}',
  [MAX_LENGTH_KEY]: '长度不能大于 {{max}}',
  [MIN_KEY]: '值不能小于 {{min}}',
  [MAX_KEY]: '值不能大于 {{max}}',
  [PATTERN_KEY]: '格式不正确',
  [LITERAL_KEY]: '{{a}}{{b}}{{c}}',
} as const
