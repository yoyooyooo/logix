import { describe, expect, it } from 'vitest'
import * as ReactLogix from '../../src/index.js'

const requiredRootExports = [
  'RuntimeProvider',
  'fieldValue',
  'rawFormMeta',
  'shallow',
  'useDispatch',
  'useImportedModule',
  'useModule',
  'useRuntime',
  'useSelector',
] as const

const forbiddenRootExports = [
  'formFieldCompanion',
  'formFieldError',
  'formRowCompanion',
  'isFormFieldCompanionSelectorDescriptor',
  'isFormFieldErrorSelectorDescriptor',
  'isFormRowCompanionSelectorDescriptor',
  'useCompanion',
  'useFieldValue',
] as const

describe('react root barrel frozen selector surface', () => {
  it('keeps canonical host and selector helper exports present', () => {
    for (const key of requiredRootExports) {
      expect(key in ReactLogix).toBe(true)
    }
  })

  it('does not leak internal descriptor helpers or second read routes', () => {
    for (const key of forbiddenRootExports) {
      expect(key in ReactLogix).toBe(false)
    }
  })
})
