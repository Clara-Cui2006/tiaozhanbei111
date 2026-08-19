<template>
  <section
    v-show="!modelValue || active"
    class="focus-panel"
    :class="{ 'focus-panel--active': active }"
  >
    <header class="focus-panel__header">
      <div>
        <span v-if="eyebrow" class="focus-panel__eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
      </div>
      <button type="button" class="focus-panel__action" @click="toggle">
        {{ active ? '返回总览' : '更多' }}
        <span aria-hidden="true">{{ active ? '↙' : '↗' }}</span>
      </button>
    </header>
    <div class="focus-panel__body">
      <slot :focused="active" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  panelKey: string
  title: string
  eyebrow?: string
  modelValue?: string
}>(), {
  eyebrow: '',
  modelValue: ''
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const active = computed(() => props.modelValue === props.panelKey)
const toggle = () => emit('update:modelValue', active.value ? '' : props.panelKey)
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
}

.focus-panel--active {
  grid-column: 1 / -1 !important;
  grid-row: 1 / -1 !important;
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
  font-size: 17px;
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
