// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { FieldGraphView } from '../../src/internal/ui/graph/FieldGraphView.js'
import type * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'

const makeMockProgram = (): FieldContracts.FieldProgram<any> => {
  return {
    // `stateSchema` / `spec` are not used in this test; use placeholders to satisfy the type requirements.
    stateSchema: {} as any,
    spec: {} as any,
    graph: {
      _tag: 'FieldGraph',
      nodes: [
        {
          id: 'field:counter',
          field: {
            id: 'field:counter',
            path: 'counter',
            displayName: 'counter',
            valueType: 'number',
            behaviors: [],
          },
          behaviors: [
            {
              fieldId: 'field:counter',
              kind: 'computed',
              // `meta` / `deps` are irrelevant for this test; placeholders only.
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
      _tag: 'FieldPlan',
      moduleId: 'MockModule',
      steps: [],
      meta: {},
    },
  } as unknown as FieldContracts.FieldProgram<any>
}

afterEach(() => {
  cleanup()
})

describe('FieldGraphView', () => {
  it('renders placeholder when no program is provided', () => {
    render(<FieldGraphView />)

    const placeholder = screen.getByText(/No field program available/i)
    expect(placeholder).not.toBeNull()
  })

  it('renders nodes and edges from provided program', () => {
    const program = makeMockProgram()

    render(<FieldGraphView program={program} />)

    // Title and counts
    expect(screen.getByText(/FieldGraph/i)).not.toBeNull()
    expect(screen.getByText(/Nodes \(1\)/i)).not.toBeNull()
    expect(screen.getByText(/Edges \(1\)/i)).not.toBeNull()

    // Field path and trait kind
    expect(screen.getByText('counter')).not.toBeNull()
    const traitLabels = screen.getAllByText(/computed/i)
    expect(traitLabels.length).toBeGreaterThan(0)

    // Edge info
    expect(screen.getByText(/field:counter → field:counter/i)).not.toBeNull()
  })

  it('invokes onSelectNode with fieldPath and respects selectedFieldPath', () => {
    const program = makeMockProgram()
    const onSelectNode = vi.fn()

    render(<FieldGraphView program={program} onSelectNode={onSelectNode} selectedFieldPath="counter" />)

    const nodeButton = screen.getByRole('button', { name: /counter/i })
    expect(nodeButton).not.toBeNull()

    fireEvent.click(nodeButton)
    expect(onSelectNode).toHaveBeenCalledTimes(1)
    expect(onSelectNode).toHaveBeenCalledWith('counter')
  })
})
