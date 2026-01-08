import { useEffect } from 'react'
import type * as Logix from '@logixjs/core'
import type { KanbanShape } from '../features/kanban'

type KanbanAction = Logix.ActionOf<KanbanShape>

export function useKanbanShortcuts({
  specDetailOpen,
  taskDetailOpen,
  onCloseDrawers,
  dispatch,
}: {
  readonly specDetailOpen: boolean
  readonly taskDetailOpen: boolean
  readonly onCloseDrawers?: () => void
  readonly dispatch: (action: KanbanAction) => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      // Ignore if drawers are open (context shifts to drawer)
      if (specDetailOpen || taskDetailOpen) {
        return
      }

      // Shortcut Map
      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault()
          dispatch({ _tag: 'board/focusNext' })
          break
        case 'k':
        case 'ArrowUp':
          e.preventDefault()
          dispatch({ _tag: 'board/focusPrev' })
          break
        case ' ':
          e.preventDefault()
          dispatch({ _tag: 'board/toggleFocusedTask' })
          break
        case 'Enter':
          e.preventDefault()
          dispatch({ _tag: 'board/openFocusedTask' })
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [specDetailOpen, taskDetailOpen, onCloseDrawers, dispatch])
}
