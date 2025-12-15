export type ErrorPatch = unknown

export type FieldErrors = Readonly<Record<string, unknown>>

export const leaf = (message: unknown): unknown => message

/**
 * item：
 * - 生成行级错误对象（允许同时携带字段级错误与 $item 行级错误）。
 */
export const item = (
  fieldErrors?: FieldErrors,
  meta?: { readonly item?: unknown },
): ErrorPatch => ({
  ...(fieldErrors ?? {}),
  ...(meta?.item !== undefined ? { $item: meta.item } : {}),
})

/**
 * list：
 * - 生成列表级错误对象（包含 $list 与逐行错误数组）。
 *
 * 说明：
 * - rows 数组的每一项可为 undefined（表示该行无错误）；
 * - 该结构仅作为领域层封装，具体写回路径由 Form/StateTrait 编译层决定。
 */
export const list = (
  rows: ReadonlyArray<unknown | undefined>,
  meta?: { readonly list?: unknown },
): ErrorPatch => ({
  rows,
  ...(meta?.list !== undefined ? { $list: meta.list } : {}),
})

export const root = (meta?: { readonly form?: unknown }): ErrorPatch =>
  meta?.form !== undefined ? { $form: meta.form } : {}

