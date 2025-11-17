import { create } from 'zustand'
import { patterns as seedPatterns } from '../data'
import type { PatternSpec } from '../types'

const clone = <T>(input: T): T => JSON.parse(JSON.stringify(input))

interface PatternState {
  patterns: PatternSpec[]
  drafts: Record<string, PatternSpec>
  selectedPatternId?: string
  selectPattern: (id: string) => void
  createDraft: () => PatternSpec
  updateDraft: (id: string, patch: Partial<PatternSpec>) => void
  saveDraft: (id: string) => void
  publishPattern: (id: string) => void
}

function createEmptyPattern(): PatternSpec {
  return {
    id: `pattern-${Date.now()}`,
    name: '新模式',
    version: 'v0.1.0',
    status: 'draft',
    summary: '模式简介',
    composition: { roles: [] },
    paramsSchema: {},
    uiSchema: {},
  }
}

export const usePatternStore = create<PatternState>((set) => ({
  patterns: seedPatterns,
  drafts: seedPatterns.reduce<Record<string, PatternSpec>>((acc, pattern) => {
    acc[pattern.id] = clone(pattern as PatternSpec)
    return acc
  }, {}),
  selectedPatternId: undefined,
  selectPattern: (id) => set({ selectedPatternId: id }),
  createDraft: () => {
    const draft = createEmptyPattern()
    set((state) => ({
      drafts: { ...state.drafts, [draft.id]: draft },
      selectedPatternId: draft.id,
    }))
    return draft
  },
  updateDraft: (id, patch) =>
    set((state) => {
      const current = state.drafts[id]
      if (!current) return state
      const next = { ...current, ...patch }
      return { ...state, drafts: { ...state.drafts, [id]: next } }
    }),
  saveDraft: (id) =>
    set((state) => {
      const draft = state.drafts[id]
      if (!draft) return state
      const isExisting = state.patterns.some((pattern) => pattern.id === id)
      return {
        ...state,
        patterns: isExisting
          ? state.patterns.map((pattern) => (pattern.id === id ? draft : pattern))
          : [...state.patterns, draft],
      }
    }),
  publishPattern: (id) =>
    set((state) => {
      const target = state.drafts[id] ?? state.patterns.find((pattern) => pattern.id === id)
      if (!target) return state
      const published = { ...target, status: 'published' as const }
      return {
        ...state,
        drafts: { ...state.drafts, [id]: published },
        patterns: state.patterns.some((pattern) => pattern.id === id)
          ? state.patterns.map((pattern) => (pattern.id === id ? published : pattern))
          : [...state.patterns, published],
      }
    }),
}))
