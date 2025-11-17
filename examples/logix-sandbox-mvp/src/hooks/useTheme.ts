import { useEffect } from 'react'
import { useDispatch, useModule, useSelector } from '@logix/react'
import { ThemeDef, type Theme } from '../modules/ThemeModule'

export type { Theme } from '../modules/ThemeModule'

export function useTheme() {
  const runtime = useModule(ThemeDef)
  const dispatch = useDispatch(runtime)
  const theme = useSelector(runtime, (s) => s.theme as Theme)

  const setTheme = (next: Theme) => dispatch({ _tag: 'setTheme', payload: next })

  // Init from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('logix-theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      dispatch({ _tag: 'setTheme', payload: stored })
    }
  }, [dispatch])

  // Apply to DOM
  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = window.document.documentElement
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    root.classList.remove('light', 'dark')
    root.classList.add(isDark ? 'dark' : 'light')

    localStorage.setItem('logix-theme', theme)
  }, [theme])

  // Listen for system changes if system mode
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const root = window.document.documentElement
      const isDark = media.matches
      root.classList.remove('light', 'dark')
      root.classList.add(isDark ? 'dark' : 'light')
    }

    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [theme])

  return { theme, setTheme }
}
