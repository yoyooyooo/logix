import React from 'react'

export const useStableId = (): string => {
  return React.useId()
}
