export type JsonPrimitive = null | boolean | number | string

export type I18nTokenParams = Readonly<Record<string, JsonPrimitive>>
export type I18nTokenParamsInput = Readonly<Record<string, JsonPrimitive | undefined>>

export type I18nMessageToken = {
  readonly _tag: 'i18n'
  readonly key: string
  readonly params?: I18nTokenParams
}

export type InvalidI18nMessageTokenReason =
  | 'keyTooLong'
  | 'tooManyParams'
  | 'paramKeyInvalid'
  | 'paramValueInvalid'
  | 'paramValueTooLong'
  | 'numberNotJsonSafe'
  | 'languageFrozen'
  | 'renderFallbackReserved'

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
  paramKeyMaxCount: 8,
  paramValueStringMaxLen: 96,
} as const

const LANGUAGE_FROZEN_KEYS = new Set(['lng', 'lngs'])
const DANGEROUS_PARAM_KEYS = new Set(['__proto__', 'prototype', 'constructor'])
const LEGACY_RENDER_FALLBACK_KEY = `default${'Value'}`
const RESERVED_RENDER_FALLBACK_KEYS = new Set([LEGACY_RENDER_FALLBACK_KEY])

const isJsonPrimitive = (value: unknown): value is JsonPrimitive =>
  value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string'

const invalidToken = (reason: InvalidI18nMessageTokenReason, details: unknown, fix: ReadonlyArray<string>): never => {
  throw new InvalidI18nMessageTokenError(reason, details, fix)
}

export const canonicalizeTokenParams = (params: I18nTokenParamsInput | undefined): I18nTokenParams | undefined => {
  if (!params) return undefined
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    invalidToken('paramValueInvalid', { field: 'params', actual: typeof params }, [
      '请传入 plain object 作为 params（Record<string, JsonPrimitive>）。',
      '不要传入数组/函数/类实例等不可序列化值。',
    ])
  }

  const entries = Object.entries(params).filter((p): p is [string, JsonPrimitive] => p[1] !== undefined)

  if (entries.length === 0) return undefined

  if (entries.length > TOKEN_BUDGET.paramKeyMaxCount) {
    invalidToken(
      'tooManyParams',
      {
        field: 'params',
        max: TOKEN_BUDGET.paramKeyMaxCount,
        actual: entries.length,
      },
      [
        `减少 params 键数量（建议 ≤ ${TOKEN_BUDGET.paramKeyMaxCount}）。`,
        '避免把大对象或展示兜底文案塞进 semantic token。',
      ],
    )
  }

  for (const [k, v] of entries) {
    if (RESERVED_RENDER_FALLBACK_KEYS.has(k)) {
      invalidToken('renderFallbackReserved', { field: `params.${k}`, key: k }, [
        '不要把旧的展示兜底字段放进 semantic token params。',
        '请把兜底文案改放到 render/renderReady 的 hints.fallback。',
      ])
    }

    if (DANGEROUS_PARAM_KEYS.has(k) || k.length === 0) {
      invalidToken('paramKeyInvalid', { field: `params.${k}`, key: k }, [
        '请使用普通字段名作为 params key，避免 __proto__/constructor/prototype 等危险键。',
        '如需传递复杂结构，请先在展示边界转换为字符串。',
      ])
    }

    if (LANGUAGE_FROZEN_KEYS.has(k)) {
      invalidToken('languageFrozen', { field: `params.${k}`, key: k }, [
        '不要在 token params 中传入 lng/lngs 等语言冻结字段。',
        '语言由外部 i18n 实例决定；token 只表达“要翻译什么”。',
      ])
    }

    if (!isJsonPrimitive(v)) {
      invalidToken('paramValueInvalid', { field: `params.${k}`, actual: typeof v }, [
        'params value 只允许 JsonPrimitive（null/boolean/number/string）。',
        '不要传入对象/数组/函数；需要时请在展示边界先格式化成字符串。',
      ])
    }

    if (typeof v === 'number' && !Number.isFinite(v)) {
      invalidToken('numberNotJsonSafe', { field: `params.${k}`, value: String(v) }, [
        '不要在 token params 中传入 NaN/Infinity。',
        '请先把该数值转换为可 JSON 化的 number 或 string。',
      ])
    }

    if (typeof v === 'string' && v.length > TOKEN_BUDGET.paramValueStringMaxLen) {
      invalidToken(
        'paramValueTooLong',
        {
          field: `params.${k}`,
          maxLen: TOKEN_BUDGET.paramValueStringMaxLen,
          actualLen: v.length,
        },
        [
          `缩短字符串值长度（建议 ≤ ${TOKEN_BUDGET.paramValueStringMaxLen}）。`,
          '把长文本留在展示边界，不要放进 semantic token。',
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

export const token = (key: string, params?: I18nTokenParamsInput): I18nMessageToken => {
  if (key.length > TOKEN_BUDGET.keyMaxLen) {
    invalidToken('keyTooLong', { field: 'key', maxLen: TOKEN_BUDGET.keyMaxLen, actualLen: key.length }, [
      `缩短 key（建议 ≤ ${TOKEN_BUDGET.keyMaxLen}）。`,
      '如果 key 过长，建议改为“稳定 key + 少量 semantic params”。',
    ])
  }

  const canon = canonicalizeTokenParams(params)
  return canon
    ? {
        _tag: 'i18n',
        key,
        params: canon,
      }
    : {
        _tag: 'i18n',
        key,
      }
}
