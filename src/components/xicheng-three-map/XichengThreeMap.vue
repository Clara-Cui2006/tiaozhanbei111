<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { StreetMapStreetStat } from '../../api/platform'
import { buildStreetCaseMetrics, normalizeStreetName } from './case-count-metrics'
import { loadStreetCollection } from './map/geojson'
import { createMapScene, type MapSceneHandle } from './map/create-map-scene'
import { createSelectionState } from './map/selection-state'
import type { StreetFeatureCollection } from './types'

const props = defineProps<{
  streets: StreetMapStreetStat[]
  selectedStreetName: string
}>()

const emit = defineEmits<{
  select: [streetName: string]
  clear: []
  error: [message: string]
}>()

const container = ref<HTMLElement | null>(null)
const store = createSelectionState()
let collection: StreetFeatureCollection | null = null
let scene: MapSceneHandle | null = null

const findAdcode = (streetName: string) => {
  const normalized = normalizeStreetName(streetName)
  return collection?.features.find((feature) => normalizeStreetName(feature.properties.name) === normalized)?.properties.adcode || ''
}

const findStreetName = (adcode: string) =>
  collection?.features.find((feature) => feature.properties.adcode === adcode)?.properties.name || ''

const syncSelection = (streetName: string, focus = false) => {
  const adcode = findAdcode(streetName)
  store.setSelected(adcode || null)
  if (focus && adcode) scene?.focusStreet(adcode)
}

onMounted(async () => {
  if (!container.value) return
  try {
    collection = await loadStreetCollection('/maps/xicheng_15_streets_clean.geojson')
    scene = createMapScene(container.value, {
      collection,
      metrics: buildStreetCaseMetrics(props.streets),
      store,
      onSelect: (adcode) => {
        store.setSelected(adcode)
        const streetName = findStreetName(adcode)
        if (streetName) emit('select', streetName)
      },
      onClear: () => {
        store.reset()
        emit('clear')
      },
    })
    syncSelection(props.selectedStreetName, Boolean(props.selectedStreetName))
  } catch (error) {
    emit('error', error instanceof Error ? error.message : '三维地图初始化失败')
  }
})

watch(
  () => props.streets,
  (streets) => scene?.updateMetrics(buildStreetCaseMetrics(streets)),
  { deep: true },
)

watch(
  () => props.selectedStreetName,
  (streetName) => syncSelection(streetName, Boolean(streetName)),
)

onBeforeUnmount(() => {
  scene?.dispose()
  scene = null
  collection = null
})

defineExpose({
  zoomIn: () => scene?.zoomBy(0.82),
  zoomOut: () => scene?.zoomBy(1.22),
  reset: () => {
    store.reset()
    scene?.resetCamera()
  },
  focusStreet: (streetName: string) => {
    const adcode = findAdcode(streetName)
    if (adcode) scene?.focusStreet(adcode)
  },
})
</script>

<template>
  <section ref="container" class="xicheng-three-map" aria-label="西城区15街道三维案件地图">
    <div class="map-glow" aria-hidden="true"></div>
  </section>
</template>

<style src="./xicheng-three-map.css"></style>
