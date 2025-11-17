export type ErrorPatch = unknown

export type FieldErrors = Readonly<Record<string, unknown>>

export const leaf = (message: unknown): unknown => message

/**
 * item：
 * - Creates a row-level error object (can carry both field-level errors and a $item row-level error).
 */
export const item = (fieldErrors?: FieldErrors, meta?: { readonly item?: unknown }): ErrorPatch => ({
  ...(fieldErrors ?? {}),
  ...(meta?.item !== undefined ? { $item: meta.item } : {}),
})

/**
 * list：
 * - Creates a list-level error object (includes $list and an array of per-row errors).
 *
 * Notes:
 * - Each entry in `rows` can be undefined (meaning that row has no error).
 * - This structure is only a domain-level wrapper; the actual write-back path is decided by the Form/StateTrait
 *   compiler layer.
 */
export const list = (rows: ReadonlyArray<unknown | undefined>, meta?: { readonly list?: unknown }): ErrorPatch => ({
  rows,
  ...(meta?.list !== undefined ? { $list: meta.list } : {}),
})

export const root = (meta?: { readonly form?: unknown }): ErrorPatch =>
  meta?.form !== undefined ? { $form: meta.form } : {}
