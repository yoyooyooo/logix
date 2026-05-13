declare const FormFieldCompanionSelectorDescriptorBrand: unique symbol

export type FormFieldCompanionSelectorDescriptor<P extends string = string> = Readonly<{
  readonly [FormFieldCompanionSelectorDescriptorBrand]: () => P
}>

declare const FormRowCompanionSelectorDescriptorBrand: unique symbol

export type FormRowCompanionSelectorDescriptor<ListPath extends string = string, FieldPath extends string = string> = Readonly<{
  readonly [FormRowCompanionSelectorDescriptorBrand]: () => readonly [ListPath, FieldPath]
}>

const FIELD_COMPANION_SELECTOR_DESCRIPTOR = Symbol.for('@logixjs/form/FormFieldCompanionSelectorDescriptor')
const ROW_COMPANION_SELECTOR_DESCRIPTOR = Symbol.for('@logixjs/form/FormRowCompanionSelectorDescriptor')

export const field = <const P extends string>(path: P): FormFieldCompanionSelectorDescriptor<P> => {
  const descriptor: Record<PropertyKey, unknown> = {}

  Object.defineProperty(descriptor, FIELD_COMPANION_SELECTOR_DESCRIPTOR, {
    value: Object.freeze({
      kind: 'field',
      path,
    }),
    enumerable: false,
    configurable: false,
    writable: false,
  })

  return Object.freeze(descriptor) as FormFieldCompanionSelectorDescriptor<P>
}

export const byRowId = <const ListPath extends string, const FieldPath extends string>(
  listPath: ListPath,
  rowId: string,
  fieldPath: FieldPath,
): FormRowCompanionSelectorDescriptor<ListPath, FieldPath> => {
  const descriptor: Record<PropertyKey, unknown> = {}

  Object.defineProperty(descriptor, ROW_COMPANION_SELECTOR_DESCRIPTOR, {
    value: Object.freeze({
      kind: 'row',
      listPath,
      rowId,
      fieldPath,
    }),
    enumerable: false,
    configurable: false,
    writable: false,
  })

  return Object.freeze(descriptor) as FormRowCompanionSelectorDescriptor<ListPath, FieldPath>
}
