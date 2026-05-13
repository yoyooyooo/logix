import type { I18nMessageToken } from '@logixjs/i18n'

export type FormErrorLeaf = Readonly<{
  readonly origin: 'rule' | 'decode' | 'manual' | 'submit'
  readonly severity: 'error' | 'warning'
  readonly message: I18nMessageToken
  readonly code?: string
}>

export type FormFieldRowSubjectRef = Readonly<{
  readonly kind: 'row'
  readonly id: string
}>

export type FormFieldTaskSubjectRef = Readonly<{
  readonly kind: 'task'
  readonly id: string
}>

export type FormFieldCleanupSubjectRef = Readonly<{
  readonly kind: 'cleanup'
  readonly id: string
}>

export type FormFieldExplainError = Readonly<{
  readonly kind: 'error'
  readonly reasonSlotId: string
  readonly error: unknown
  readonly sourceRef: string
  readonly subjectRef?: FormFieldRowSubjectRef | FormFieldTaskSubjectRef
}>

export type FormFieldExplainPending = Readonly<{
  readonly kind: 'pending'
  readonly submitImpact: 'block' | 'observe'
  readonly reasonSlotId?: string
  readonly sourceRef: string
  readonly subjectRef: FormFieldTaskSubjectRef
}>

export type FormFieldExplainStale = Readonly<{
  readonly kind: 'stale'
  readonly reasonSlotId: string
  readonly sourceRef: string
  readonly subjectRef: FormFieldTaskSubjectRef
}>

export type FormFieldExplainCleanup = Readonly<{
  readonly kind: 'cleanup'
  readonly cause: 'remove' | 'replace'
  readonly reasonSlotId: string
  readonly sourceRef: string
  readonly subjectRef: FormFieldCleanupSubjectRef
}>

export type FormFieldExplain =
  | FormFieldExplainError
  | FormFieldExplainPending
  | FormFieldExplainStale
  | FormFieldExplainCleanup

export type FormFieldExplainResult = FormFieldExplain | undefined

declare const FormFieldErrorSelectorDescriptorBrand: unique symbol

export type FormFieldErrorSelectorDescriptor = Readonly<{
  readonly [FormFieldErrorSelectorDescriptorBrand]: true
}>

export type ErrorPatch = unknown

export type FieldErrors = Readonly<Record<string, unknown>>

export const leaf = (
  message: I18nMessageToken,
  options?: Readonly<{
    readonly origin?: FormErrorLeaf['origin']
    readonly severity?: FormErrorLeaf['severity']
    readonly code?: string
  }>,
): FormErrorLeaf => ({
  origin: options?.origin ?? 'manual',
  severity: options?.severity ?? 'error',
  message,
  ...(options?.code ? { code: options.code } : null),
})

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
 * - This structure is only a domain-level wrapper; the actual write-back path is decided by the Form/field-kernel
 *   compiler layer.
 */
export const list = (rows: ReadonlyArray<unknown | undefined>, meta?: { readonly list?: unknown }): ErrorPatch => ({
  rows,
  ...(meta?.list !== undefined ? { $list: meta.list } : {}),
})

export const root = (meta?: { readonly form?: unknown }): ErrorPatch =>
  meta?.form !== undefined ? { $form: meta.form } : {}

const FIELD_ERROR_SELECTOR_DESCRIPTOR = Symbol.for('@logixjs/form/FormFieldErrorSelectorDescriptor')

export const field = (path: string): FormFieldErrorSelectorDescriptor => {
  const descriptor: Record<PropertyKey, unknown> = {}

  Object.defineProperty(descriptor, FIELD_ERROR_SELECTOR_DESCRIPTOR, {
    value: Object.freeze({
      kind: 'field',
      path,
    }),
    enumerable: false,
    configurable: false,
    writable: false,
  })

  return Object.freeze(descriptor) as FormFieldErrorSelectorDescriptor
}
