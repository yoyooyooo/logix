import { create } from 'zustand'
import { intents as seedIntents } from '../data'
import type { IntentSpec } from '../types'

const clone = <T>(input: T): T => JSON.parse(JSON.stringify(input))

interface IntentState {
  intents: IntentSpec[]
  drafts: Record<string, IntentSpec>
  selectedIntentId: string
  selectIntent: (id: string) => void
  loadIntentSnapshot: (intent: IntentSpec) => void
  updateIntent: (id: string, patch: Partial<IntentSpec>) => void
}

const initialDrafts = seedIntents.reduce<Record<string, IntentSpec>>((acc, intent) => {
  acc[intent.id] = clone(intent)
  return acc
}, {})

export const useIntentStore = create<IntentState>((set) => ({
  intents: seedIntents,
  drafts: initialDrafts,
  selectedIntentId: '',
  selectIntent: (id) => set({ selectedIntentId: id }),
  loadIntentSnapshot: (intent) =>
    set((state) => {
      const snapshot = clone(intent)
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [snapshot.id]: snapshot,
        },
      }
    }),
  updateIntent: (id, patch) =>
    set((state) => {
      const current = state.drafts[id]
      if (!current) return state
      const next: IntentSpec = { ...current, ...patch }
      return { ...state, drafts: { ...state.drafts, [id]: next } }
    }),
}))
