import type { MapSelectionState } from '../types'

export interface MapSelectionStore {
  snapshot(): MapSelectionState
  setHovered(adcode: string | null): void
  setSelected(adcode: string | null): void
  reset(): void
  subscribe(listener: (state: MapSelectionState) => void): () => void
}

export function createSelectionState(initial: Partial<MapSelectionState> = {}): MapSelectionStore {
  let state: MapSelectionState = {
    hovered: initial.hovered ?? null,
    selected: initial.selected ?? null,
  }
  const listeners = new Set<(state: MapSelectionState) => void>()

  const notify = () => {
    const current = { ...state }
    listeners.forEach((listener) => listener(current))
  }

  const update = (next: MapSelectionState) => {
    if (next.hovered === state.hovered && next.selected === state.selected) return
    state = next
    notify()
  }

  return {
    snapshot: () => ({ ...state }),
    setHovered: (hovered) => update({ ...state, hovered }),
    setSelected: (selected) => update({ ...state, selected }),
    reset: () => update({ hovered: null, selected: null }),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
