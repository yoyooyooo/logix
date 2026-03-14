import { expect, test, vi } from 'vitest'
import { waitForBodyText } from './react-boot-resolve.wait.js'

test('waitForBodyText should resolve from DOM mutation without waiting for requestAnimationFrame', async () => {
  const originalRaf = globalThis.requestAnimationFrame
  const rafSpy = vi.fn()

  ;(globalThis as any).requestAnimationFrame = rafSpy
  document.body.innerHTML = '<div>Loading…</div>'

  try {
    const waiter = waitForBodyText('Ready', 100)

    queueMicrotask(() => {
      document.body.innerHTML = '<div>Ready</div>'
    })

    await expect(waiter).resolves.toBeUndefined()
    expect(rafSpy).not.toHaveBeenCalled()
  } finally {
    ;(globalThis as any).requestAnimationFrame = originalRaf
    document.body.innerHTML = ''
  }
})
