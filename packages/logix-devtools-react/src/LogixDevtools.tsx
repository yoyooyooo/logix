import React from 'react'
import * as Logix from '@logix/core'
import { DevtoolsShell } from './DevtoolsShell.js'
import { useDevtoolsState, useDevtoolsDispatch } from './DevtoolsHooks.js'

export interface LogixDevtoolsProps {
  readonly position?: 'bottom-left' | 'bottom-right'
  readonly initialOpen?: boolean
  /**
   * 可选：根据当前选中的 moduleId 提供对应的 StateTraitProgram，
   * 供 Devtools 在 Inspector 面板中渲染 StateTraitGraph 并与 Timeline 联动。
   * - 若未提供，则 Graph 部分仅显示占位提示，不影响 Timeline / Inspector 行为。
   */
  readonly getProgramForModule?: (
    moduleId: string,
  ) => Logix.StateTrait.StateTraitProgram<any> | undefined
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
