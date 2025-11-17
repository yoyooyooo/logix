const styleMarkerAttribute = 'data-logix-devtools-style'

export const ensureDevtoolsStyles = (): void => {
  if (typeof document === 'undefined') return

  const existing = document.querySelector(`link[${styleMarkerAttribute}="true"]`)
  if (existing) return

  let href: string
  try {
    href = new URL('./style.css', import.meta.url).toString()
  } catch {
    return
  }

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.setAttribute(styleMarkerAttribute, 'true')

  document.head.appendChild(link)
}
