import React from 'react'
import * as Logix from '@logixjs/core'
import { DevtoolsShell } from './DevtoolsShell.js'
import { useDevtoolsState, useDevtoolsDispatch } from '../hooks/DevtoolsHooks.js'

export interface LogixDevtoolsProps {
  readonly position?: 'bottom-left' | 'bottom-right'
  readonly initialOpen?: boolean
  /**
   * Optional: provide a StateTraitProgram for the currently selected moduleId,
   * so Devtools can render StateTraitGraph in the Inspector panel and coordinate with the Timeline.
   * - If not provided, the Graph section only shows a placeholder and does not affect Timeline / Inspector behavior.
   */
  readonly getProgramForModule?: (moduleId: string) => Logix.StateTrait.StateTraitProgram<any> | undefined
}

const LogixDevtoolsInner: React.FC<LogixDevtoolsProps> = ({
  position = 'bottom-left',
  initialOpen = false,
  getProgramForModule,
}) => {
  const { open } = useDevtoolsState()
  const dispatch = useDevtoolsDispatch()

  React.useEffect(() => {
    if (initialOpen && !open) {
      dispatch({ _tag: 'toggleOpen', payload: undefined })
    }
  }, [initialOpen, open, dispatch])

  return <DevtoolsShell position={position} getProgramForModule={getProgramForModule} />
}

export const LogixDevtools: React.FC<LogixDevtoolsProps> = (props) => <LogixDevtoolsInner {...props} />
