import { create } from 'zustand'

interface SessionState {
  hasRequirementInput: boolean
  setHasRequirementInput: (value: boolean) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  hasRequirementInput: false,
  setHasRequirementInput: (value) => set({ hasRequirementInput: value }),
}))
