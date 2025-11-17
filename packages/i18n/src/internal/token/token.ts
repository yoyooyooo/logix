export type JsonPrimitive = null | boolean | number | string

export type I18nTokenOptions = Readonly<Record<string, JsonPrimitive>>
export type I18nTokenOptionsInput = Readonly<Record<string, JsonPrimitive | undefined>>

export type I18nMessageToken = {
  readonly _tag: 'i18n'
  readonly key: string
  readonly options?: I18nTokenOptions
}

export type InvalidI18nMessageTokenReason =
  | 'keyTooLong'
  | 'tooManyOptions'
  | 'optionKeyInvalid'
  | 'optionValueInvalid'
  | 'optionValueTooLong'
  | 'numberNotJsonSafe'
  | 'languageFrozen'

export class InvalidI18nMessageTokenError extends Error {
  readonly name = 'InvalidI18nMessageTokenError'

  constructor(
    readonly reason: InvalidI18nMessageTokenReason,
    readonly details: unknown,
    readonly fix: ReadonlyArray<string>,
  ) {
    super(`[InvalidI18nMessageTokenError] reason=${reason}`)
  }
}

const TOKEN_BUDGET = {
  keyMaxLen: 96,
  optionKeyMaxCount: 8,
  optionValueStringMaxLen: 96,
} as const

const LANGUAGE_FROZEN_KEYS = new Set(['lng', 'lngs'])
const DANGEROUS_OPTION_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

const isJsonPrimitive = (value: unknown): value is JsonPrimitive =>
  value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string'

const invalidToken = (reason: InvalidI18nMessageTokenReason, details: unknown, fix: ReadonlyArray<string>): never => {
  throw new InvalidI18nMessageTokenError(reason, details, fix)
}

export const canonicalizeTokenOptions = (options: I18nTokenOptionsInput | undefined): I18nTokenOptions | undefined => {
  if (!options) return undefined
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    invalidToken('optionValueInvalid', { field: 'options', actual: typeof options }, [
      '请传入 plain object 作为 options（Record<string, JsonPrimitive>）。',
      '不要传入数组/函数/类实例等不可序列化值。',
    ])
  }

  const entries = Object.entries(options).filter((p): p is [string, JsonPrimitive] => p[1] !== undefined)

  if (entries.length === 0) return undefined

  if (entries.length > TOKEN_BUDGET.optionKeyMaxCount) {
    invalidToken(
      'tooManyOptions',
      {
        field: 'options',
        max: TOKEN_BUDGET.optionKeyMaxCount,
        actual: entries.length,
      },
      [
        `减少 options 键数量（建议 ≤ ${TOKEN_BUDGET.optionKeyMaxCount}）。`,
        '把较长的信息挪到 key 或 defaultValue；避免把大对象塞进 token。',
      ],
    )
  }

  for (const [k, v] of entries) {
    if (DANGEROUS_OPTION_KEYS.has(k) || k.length === 0) {
      invalidToken('optionKeyInvalid', { field: `options.${k}`, key: k }, [
        '请使用普通字段名作为 options key（避免 __proto__/constructor/prototype 等危险键）。',
        '如需传递复杂结构，请先在展示边界转换为字符串。',
      ])
    }

    if (LANGUAGE_FROZEN_KEYS.has(k)) {
      invalidToken('languageFrozen', { field: `options.${k}`, key: k }, [
        '不要在 token options 中传入 lng/lngs 等语言冻结字段。',
        '语言由外部 i18n 实例决定；token 只表达“要翻译什么”。',
      ])
    }

    if (!isJsonPrimitive(v)) {
      invalidToken('optionValueInvalid', { field: `options.${k}`, actual: typeof v }, [
        'options value 只允许 JsonPrimitive（null/boolean/number/string）。',
        '不要传入对象/数组/函数；需要时请在展示边界先格式化成字符串。',
      ])
    }

    if (typeof v === 'number' && !Number.isFinite(v)) {
      invalidToken('numberNotJsonSafe', { field: `options.${k}`, value: String(v) }, [
        '不要在 token options 中传入 NaN/Infinity。',
        '请先把该数值转换为可 JSON 化的 number 或 string。',
      ])
    }

    if (typeof v === 'string' && v.length > TOKEN_BUDGET.optionValueStringMaxLen) {
      invalidToken(
        'optionValueTooLong',
        {
          field: `options.${k}`,
          maxLen: TOKEN_BUDGET.optionValueStringMaxLen,
          actualLen: v.length,
        },
        [
          `缩短字符串值长度（建议 ≤ ${TOKEN_BUDGET.optionValueStringMaxLen}）。`,
          '把长文本移到 defaultValue 或直接在展示边界生成最终字符串。',
        ],
      )
    }
  }

  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

  const out: Record<string, JsonPrimitive> = {}
  for (const [k, v] of entries) {
    out[k] = v
  }
  return out
}

export const token = (key: string, options?: I18nTokenOptionsInput): I18nMessageToken => {
  if (key.length > TOKEN_BUDGET.keyMaxLen) {
    invalidToken('keyTooLong', { field: 'key', maxLen: TOKEN_BUDGET.keyMaxLen, actualLen: key.length }, [
      `缩短 key（建议 ≤ ${TOKEN_BUDGET.keyMaxLen}）。`,
      '如果 key 过长，建议改为“稳定 key + 变量 options/defaultValue”。',
    ])
  }

  const canon = canonicalizeTokenOptions(options)
  return canon
    ? {
        _tag: 'i18n',
        key,
        options: canon,
      }
    : {
        _tag: 'i18n',
        key,
      }
}
