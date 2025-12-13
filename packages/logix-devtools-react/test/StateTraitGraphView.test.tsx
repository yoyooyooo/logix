// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { StateTraitGraphView } from '../src/ui/graph/StateTraitGraphView.js'
import type * as Logix from '@logix/core'

const makeMockProgram = (): Logix.StateTrait.StateTraitProgram<any> => {
  return {
    // stateSchema / spec 在本测试中不会被使用，这里使用占位值以满足类型要求。
    stateSchema: {} as any,
    spec: {} as any,
    graph: {
      _tag: 'StateTraitGraph',
      nodes: [
        {
          id: 'field:counter',
          field: {
            id: 'field:counter',
            path: 'counter',
            displayName: 'counter',
            valueType: 'number',
            traits: [],
          },
          traits: [
            {
              fieldId: 'field:counter',
              kind: 'computed',
              // meta / deps 对本测试无关，仅占位。
              meta: { derive: (() => 0) as any },
              deps: [],
            },
          ],
          meta: {},
        },
      ],
      edges: [
        {
          id: 'edge:counter',
          from: 'field:counter',
          to: 'field:counter',
          kind: 'computed',
        },
      ],
      resources: [],
      meta: { moduleId: 'MockModule' },
    },
    plan: {
      _tag: 'StateTraitPlan',
      moduleId: 'MockModule',
      steps: [],
      meta: {},
    },
  } as unknown as Logix.StateTrait.StateTraitProgram<any>
}

afterEach(() => {
  cleanup()
})

describe('StateTraitGraphView', () => {
  it('renders placeholder when no program is provided', () => {
    render(<StateTraitGraphView />)

    const placeholder = screen.getByText(/No StateTraitProgram available/i)
    expect(placeholder).not.toBeNull()
  })

  it('renders nodes and edges from provided program', () => {
    const program = makeMockProgram()

    render(<StateTraitGraphView program={program} />)

    // 标题与计数信息
    expect(screen.getByText(/StateTraitGraph/i)).not.toBeNull()
    expect(screen.getByText(/Nodes \(1\)/i)).not.toBeNull()
    expect(screen.getByText(/Edges \(1\)/i)).not.toBeNull()

    // 节点字段路径与 Trait kind
    expect(screen.getByText('counter')).not.toBeNull()
    const traitLabels = screen.getAllByText(/computed/i)
    expect(traitLabels.length).toBeGreaterThan(0)

    // 边信息
    expect(screen.getByText(/field:counter → field:counter/i)).not.toBeNull()
  })

  it('invokes onSelectNode with fieldPath and respects selectedFieldPath', () => {
    const program = makeMockProgram()
    const onSelectNode = vi.fn()

    render(
      <StateTraitGraphView
        program={program}
        onSelectNode={onSelectNode}
        selectedFieldPath="counter"
      />,
    )

    const nodeButton = screen.getByRole('button', { name: /counter/i })
    expect(nodeButton).not.toBeNull()

    fireEvent.click(nodeButton)
    expect(onSelectNode).toHaveBeenCalledTimes(1)
    expect(onSelectNode).toHaveBeenCalledWith('counter')
  })
})
