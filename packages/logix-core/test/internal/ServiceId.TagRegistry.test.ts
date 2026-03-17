import { describe, expect, it } from '@effect/vitest'
import * as ServiceId from '../../src/internal/serviceId.js'

describe('serviceId tag registry', () => {
  it('returns a stable cached tag for the same serviceId', () => {
    const a = ServiceId.tagFromServiceId('svc/demo')
    const b = ServiceId.tagFromServiceId('svc/demo')

    expect(a).toBe(b)
    expect(ServiceId.fromTag(a as any)).toBe('svc/demo')
  })

  it('returns a stable cached module runtime tag from moduleId', () => {
    const a = ServiceId.moduleRuntimeTagFromModuleId('DemoModule')
    const b = ServiceId.moduleRuntimeTagFromModuleId('DemoModule')

    expect(a).toBe(b)
    expect(ServiceId.fromTag(a as any)).toBe('@logixjs/Module/DemoModule')
  })
})
