// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StreetFeatureCollection } from './types'
import { createMapScene } from './map/create-map-scene'
import XichengThreeMap from './XichengThreeMap.vue'

const mocks = vi.hoisted(() => ({
  handles: [] as Array<{
    focusStreet: ReturnType<typeof vi.fn>
    zoomBy: ReturnType<typeof vi.fn>
    resetCamera: ReturnType<typeof vi.fn>
    resize: ReturnType<typeof vi.fn>
    updateMetrics: ReturnType<typeof vi.fn>
    dispose: ReturnType<typeof vi.fn>
  }>,
  options: [] as Array<{
    onSelect(adcode: string): void
    onClear(): void
  }>,
}))

vi.mock('./map/create-map-scene', () => ({
  createMapScene: vi.fn(),
}))

const collection = JSON.parse(
  readFileSync(new URL('../../../public/maps/xicheng_15_streets_clean.geojson', import.meta.url), 'utf8')
) as StreetFeatureCollection

const initialStreets = [
  { streetCode: '110102011', streetName: '金融街街道', caseCount: 8 },
  { streetCode: '110102010', streetName: '德胜街道', caseCount: 4 },
]

const updatedStreets = [
  { streetCode: '110102011', streetName: '金融街街道', caseCount: 28 },
  { streetCode: '110102010', streetName: '德胜街道', caseCount: 1 },
]

const createMapSceneMock = vi.mocked(createMapScene)

beforeEach(() => {
  mocks.handles.length = 0
  mocks.options.length = 0
  createMapSceneMock.mockReset()
  createMapSceneMock.mockImplementation((_container, options) => {
    const handle = {
      focusStreet: vi.fn(),
      zoomBy: vi.fn(),
      resetCamera: vi.fn(),
      resize: vi.fn(),
      updateMetrics: vi.fn(),
      dispose: vi.fn(),
    }
    mocks.handles.push(handle)
    mocks.options.push(options)
    return handle
  })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => collection,
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('XichengThreeMap', () => {
  it('loads the cleaned street collection and creates one scene', async () => {
    const wrapper = mount(XichengThreeMap, {
      props: { streets: initialStreets, selectedStreetName: '' },
    })

    await flushPromises()

    expect(fetch).toHaveBeenCalledWith('/maps/xicheng_15_streets_clean.geojson')
    expect(createMapSceneMock).toHaveBeenCalledTimes(1)
    expect(mocks.options[0]).toMatchObject({ collection })

    wrapper.unmount()
  })

  it('updates scene metrics when dashboard street statistics change', async () => {
    const wrapper = mount(XichengThreeMap, {
      props: { streets: initialStreets, selectedStreetName: '' },
    })
    await flushPromises()

    await wrapper.setProps({ streets: updatedStreets })

    expect(mocks.handles[0]?.updateMetrics).toHaveBeenLastCalledWith(expect.objectContaining({
      '110102011': expect.objectContaining({ caseCount: 28, level: 5 }),
    }))

    wrapper.unmount()
  })

  it('focuses the administrative code mapped from the selected street name', async () => {
    const wrapper = mount(XichengThreeMap, {
      props: { streets: initialStreets, selectedStreetName: '' },
    })
    await flushPromises()

    await wrapper.setProps({ selectedStreetName: '金融街' })

    expect(mocks.handles[0]?.focusStreet).toHaveBeenCalledWith('110102011')

    wrapper.unmount()
  })

  it('forwards scene select and clear interactions as component events', async () => {
    const wrapper = mount(XichengThreeMap, {
      props: { streets: initialStreets, selectedStreetName: '' },
    })
    await flushPromises()

    mocks.options[0]?.onSelect('110102011')
    mocks.options[0]?.onClear()

    expect(wrapper.emitted('select')).toEqual([['金融街街道']])
    expect(wrapper.emitted('clear')).toEqual([[]])

    wrapper.unmount()
  })

  it('disposes the single scene when the viewport unmounts', async () => {
    const wrapper = mount(XichengThreeMap, {
      props: { streets: initialStreets, selectedStreetName: '' },
    })
    await flushPromises()

    wrapper.unmount()

    expect(mocks.handles[0]?.dispose).toHaveBeenCalledTimes(1)
  })
})
