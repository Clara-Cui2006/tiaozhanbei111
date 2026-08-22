<template>
  <section
    ref="panelRef"
    v-show="!modelValue || active"
    class="focus-panel"
    :class="{ 'focus-panel--active': active }"
  >
    <header class="focus-panel__header">
      <div>
        <span v-if="eyebrow" class="focus-panel__eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
      </div>
      <button v-if="!hideAction" type="button" class="focus-panel__action" @click="toggle">
        {{ active ? '返回总览' : '更多' }}
        <span aria-hidden="true">{{ active ? '↙' : '↗' }}</span>
      </button>
      <slot v-else name="header-extra" />
    </header>
    <div class="focus-panel__body">
      <slot :focused="active" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

const props = withDefaults(defineProps<{
  panelKey: string
  title: string
  eyebrow?: string
  modelValue?: string
  hideAction?: boolean
}>(), {
  eyebrow: '',
  modelValue: '',
  hideAction: false
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const active = computed(() => props.modelValue === props.panelKey)
const panelRef = ref<HTMLElement>()
const animationTiming = '460ms cubic-bezier(0.22, 1, 0.36, 1)'

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> }
}

const toggle = () => {
  const update = async () => {
    emit('update:modelValue', active.value ? '' : props.panelKey)
    await nextTick()
  }
  const startViewTransition = (document as ViewTransitionDocument).startViewTransition
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !panelRef.value) {
    void update()
    return
  }

  if (startViewTransition) {
    panelRef.value.style.viewTransitionName = 'dashboard-focus-panel'
    const transition = startViewTransition.call(document, update)
    void transition.finished.finally(() => panelRef.value?.style.removeProperty('view-transition-name'))
    return
  }

  const panel = panelRef.value
  const before = panel.getBoundingClientRect()
  void update().then(() => {
    const after = panel.getBoundingClientRect()
    panel.style.transition = 'none'
    panel.style.transformOrigin = 'top left'
    panel.style.transform = `translate(${before.left - after.left}px, ${before.top - after.top}px) scale(${before.width / after.width}, ${before.height / after.height})`
    panel.style.opacity = '0.9'
    panel.style.filter = 'brightness(0.92)'
    void panel.offsetWidth
    requestAnimationFrame(() => {
      panel.style.transition = `transform ${animationTiming}, opacity ${animationTiming}, filter ${animationTiming}`
      panel.style.transform = 'none'
      panel.style.opacity = '1'
      panel.style.filter = 'brightness(1)'
      const cleanup = () => {
        panel.removeEventListener('transitionend', onTransitionEnd)
        panel.style.removeProperty('transition')
        panel.style.removeProperty('transform-origin')
        panel.style.removeProperty('transform')
        panel.style.removeProperty('opacity')
        panel.style.removeProperty('filter')
      }
      const onTransitionEnd = (event: TransitionEvent) => {
        if (event.target === panel && event.propertyName === 'transform') cleanup()
      }
      panel.addEventListener('transitionend', onTransitionEnd)
      window.setTimeout(cleanup, 520)
    })
  })
}
</script>

<style scoped>
.focus-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(89, 204, 246, 0.32);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(8, 35, 66, 0.96), rgba(3, 18, 38, 0.98));
  box-shadow: inset 0 1px 0 rgba(196, 244, 255, 0.06), 0 12px 28px rgba(0, 7, 22, 0.2);
  transition: border-color 240ms ease, box-shadow 240ms ease;
}

.focus-panel--active {
  grid-column: 1 / -1 !important;
  grid-row: 1 / -1 !important;
  border-color: rgba(93, 221, 255, 0.58);
  box-shadow: inset 0 1px 0 rgba(220, 250, 255, 0.12), 0 18px 42px rgba(0, 8, 28, 0.34);
}

:global(::view-transition-group(dashboard-focus-panel)) {
  animation-duration: 460ms;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

:global(::view-transition-old(dashboard-focus-panel)),
:global(::view-transition-new(dashboard-focus-panel)) {
  animation-duration: 460ms;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .focus-panel { transition: none; }
}

.focus-panel__header {
  display: flex;
  min-height: 42px;
  flex: 0 0 42px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 14px;
  border-bottom: 1px solid rgba(89, 204, 246, 0.22);
  background: linear-gradient(90deg, rgba(12, 75, 126, 0.34), transparent 74%);
}

.focus-panel__header h2 {
  margin: 0;
  color: #effbff;
  font-size: 24px;
  line-height: 1.1;
}

.focus-panel__eyebrow {
  display: block;
  margin-bottom: 2px;
  color: #69dcff;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.2px;
}

.focus-panel__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 11px;
  border: 1px solid rgba(78, 208, 255, 0.5);
  border-radius: 6px;
  background: rgba(7, 61, 104, 0.68);
  color: #bcefff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
}

.focus-panel__action:hover {
  border-color: #63e1ff;
  color: #fff;
  box-shadow: 0 0 16px rgba(65, 205, 255, 0.24);
}

.focus-panel__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
