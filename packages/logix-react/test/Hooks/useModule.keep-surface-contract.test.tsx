import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useImportedModule, useModule, useSelector } from '../../src/Hooks.js'

const Child = Logix.Module.make('KeepSurfaceChild', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {},
})

const Parent = Logix.Module.make('KeepSurfaceParent', {
  state: Schema.Struct({ ready: Schema.Boolean }),
  actions: {},
})

const ChildProgram = Logix.Program.make(Child, {
  initial: { count: 0 },
})

const ParentProgram = Logix.Program.make(Parent, {
  initial: { ready: true },
  capabilities: {
    imports: [ChildProgram],
  },
})

describe('useModule keep-surface contracts', () => {
  it('keeps ModuleRef identity, custom fields, and imported-child routes stable', async () => {
    const runtime = Logix.Runtime.make(ParentProgram)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const host = useModule(ParentProgram, { key: 'parent:keep-surface' })
        const ref = useModule(Child.tag)
        const countByRef = useSelector(ref as any, (s: any) => s.count)
        const countByRuntime = useSelector(ref.runtime as any, (s: any) => s.count)
        const child = useImportedModule(host, Child.tag)
        const childByRef = host.imports.get(Child.tag)
        const ready = useSelector(host as any, (s: any) => s.ready) as boolean

        return {
          ready,
          countByRef,
          countByRuntime,
          childId: String(child.runtime.instanceId),
          childByRefId: String(childByRef.runtime.instanceId),
        }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.ready).toBe(true)
      expect(result.current.countByRef).toBe(0)
      expect(result.current.countByRuntime).toBe(0)
      expect(result.current.childId).toBe(result.current.childByRefId)
    })
  })
})
