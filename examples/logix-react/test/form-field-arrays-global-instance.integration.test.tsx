import { describe, expect, it } from 'vitest'
// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { FormFieldArraysDemoLayout } from '../src/demos/form/FormFieldArraysDemoLayout'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const waitForExpect = async (assertion: () => void): Promise<void> => {
  const started = Date.now()
  let lastError: unknown

  while (Date.now() - started < 1200) {
    try {
      assertion()
      return
    } catch (error) {
      lastError = error
    }

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
  }

  if (lastError) throw lastError
  assertion()
}

describe('form-field-arrays global instance behavior', () => {
  it('restores row-heavy form state after route-like unmount/remount', async () => {
    const Host: React.FC<{ readonly route: 'arrays' | 'other' }> = ({ route }) =>
      route === 'arrays' ? <FormFieldArraysDemoLayout /> : <div data-testid="other-route">other route</div>

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    await act(async () => {
      root.render(<Host route="arrays" />)
    })

    await waitForExpect(() => {
      expect(container.querySelector('[data-testid="field-arrays-scope"]')?.textContent).toBe('global')
      expect(container.querySelector('[data-testid="field-arrays-row-count"]')?.textContent).toBe('0')
    })

    const firstInstanceId = container.querySelector('[data-testid="field-arrays-instance-id"]')?.textContent

    await act(async () => {
      ;(container.querySelector('[data-testid="field-arrays-append"]') as HTMLButtonElement | null)?.click()
    })

    await waitForExpect(() => {
      expect(container.querySelector('[data-testid="field-arrays-row-count"]')?.textContent).toBe('1')
    })

    await act(async () => {
      root.render(<Host route="other" />)
    })

    await waitForExpect(() => {
      expect(container.querySelector('[data-testid="other-route"]')?.textContent).toBe('other route')
    })

    await act(async () => {
      root.render(<Host route="arrays" />)
    })

    await waitForExpect(() => {
      expect(container.querySelector('[data-testid="field-arrays-scope"]')?.textContent).toBe('global')
      expect(container.querySelector('[data-testid="field-arrays-row-count"]')?.textContent).toBe('1')
      expect(container.querySelector('[data-testid="field-arrays-instance-id"]')?.textContent).toBe(firstInstanceId)
      expect(container.querySelector('[data-testid="field-arrays-restore-cost"]')?.textContent).toMatch(/ms$/)
    })

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
