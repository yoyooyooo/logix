import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { IntentSpec } from '../types'
import { usePlanSimulator } from '../hooks/use-plan-simulator'

const PlanSimulationContext = createContext<ReturnType<typeof usePlanSimulator> | null>(null)

interface ProviderProps {
  intent?: IntentSpec
  children: ReactNode
}

export function PlanSimulationProvider({ intent, children }: ProviderProps) {
  const value = usePlanSimulator(intent)
  return <PlanSimulationContext.Provider value={value}>{children}</PlanSimulationContext.Provider>
}

export function usePlanSimulationContext() {
  const ctx = useContext(PlanSimulationContext)
  if (!ctx) throw new Error('usePlanSimulationContext must be used inside PlanSimulationProvider')
  return ctx
}
