export const waitForBodyText = async (text: string, timeoutMs: number): Promise<void> => {
  if (document.body.textContent?.includes(text)) {
    return
  }

  const body = document.body
  const deadline = performance.now() + timeoutMs

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      observer.disconnect()
      clearTimeout(timeoutId)
      fn()
    }

    const observer = new MutationObserver(() => {
      if (body.textContent?.includes(text)) {
        finish(resolve)
      }
    })

    const timeoutId = setTimeout(() => {
      finish(() => reject(new Error(`waitForBodyText timeout: ${text}`)))
    }, Math.max(0, deadline - performance.now()))

    observer.observe(body, {
      subtree: true,
      childList: true,
      characterData: true,
    })
  })
}
