// @vitest-environment jsdom
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DrilldownHost } from '../../src/internal/ui/workbench/DrilldownHost.js'

describe('DVTools subordinate drilldowns', () => {
  it('keeps timeline available only through drilldown host', () => {
    render(<DrilldownHost drilldown={{ kind: 'timeline' }} />)

    expect(screen.getByText(/Timeline/i)).not.toBeNull()
  })
})
