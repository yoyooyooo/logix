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

export const enUS = {
  [REQUIRED_KEY]: 'Required',
  [EMAIL_KEY]: 'Invalid email address',
  [MIN_LENGTH_KEY]: 'Must be at least {{min}} characters',
  [MAX_LENGTH_KEY]: 'Must be at most {{max}} characters',
  [MIN_KEY]: 'Must be at least {{min}}',
  [MAX_KEY]: 'Must be at most {{max}}',
  [PATTERN_KEY]: 'Invalid format',
  [LITERAL_KEY]: '{{a}}{{b}}{{c}}',
} as const
