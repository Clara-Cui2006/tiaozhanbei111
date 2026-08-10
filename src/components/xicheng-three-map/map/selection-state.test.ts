import { describe, expect, it, vi } from 'vitest'
import { createSelectionState } from './selection-state'

describe('createSelectionState', () => {
  it('使用提供的初始悬浮和选中状态', () => {
    const store = createSelectionState({ hovered: '110102001', selected: '110102003' })

    expect(store.snapshot()).toEqual({ hovered: '110102001', selected: '110102003' })
  })

  it('记录悬浮和选中并在复位时清空', () => {
    const store = createSelectionState()

    store.setHovered('110102001')
    store.setSelected('110102003')
    expect(store.snapshot()).toEqual({ hovered: '110102001', selected: '110102003' })
    store.reset()
    expect(store.snapshot()).toEqual({ hovered: null, selected: null })
  })

  it('只在状态实际变化时通知订阅者并允许取消订阅', () => {
    const store = createSelectionState()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.setHovered('110102001')
    store.setHovered('110102001')
    unsubscribe()
    store.setSelected('110102003')

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ hovered: '110102001', selected: null })
  })
})
