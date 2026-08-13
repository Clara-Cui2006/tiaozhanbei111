<template>
  <section class="priority-shell">
    <header class="priority-heading">
      <div><span class="eyebrow">全系统统一标识</span><h3>{{ title }}</h3></div>
      <div class="priority-total"><strong>{{ alerts.length }}</strong><span>条预警案件</span></div>
    </header>
    <div class="tag-ribbon">
      <button
        v-for="item in stats"
        :key="item.tag"
        type="button"
        class="tag-node"
        :class="{ active: item.tag === modelValue }"
        @click="$emit('update:modelValue', item.tag)"
      >
        <span class="tag-index">{{ String(PRIORITY_TAGS.indexOf(item.tag) + 1).padStart(2, '0') }}</span>
        <span class="tag-copy"><b>{{ item.tag }}</b><small>高发：{{ item.topStreet }}</small></span>
        <em>{{ item.count }}</em>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PRIORITY_TAGS, aggregatePriorityAlerts, type PriorityAlert, type PriorityTag } from '../features/priority-alerts'

const props = defineProps<{ modelValue: PriorityTag; alerts: PriorityAlert[]; title?: string }>()
defineEmits<{ 'update:modelValue': [value: PriorityTag] }>()
const stats = computed(() => aggregatePriorityAlerts(props.alerts))
</script>

<style scoped>
.priority-shell{position:relative;overflow:hidden;margin:16px 0;padding:18px;border:1px solid rgba(73,192,255,.28);border-radius:14px;background:linear-gradient(135deg,rgba(9,34,61,.96),rgba(3,18,36,.92));box-shadow:inset 0 0 36px rgba(42,164,227,.08),0 18px 42px rgba(0,0,0,.18)}
.priority-shell:after{position:absolute;inset:0;content:"";pointer-events:none;background:linear-gradient(110deg,transparent 0 45%,rgba(96,217,255,.05) 50%,transparent 55%);transform:translateX(-60%);animation:scan 8s linear infinite}
.priority-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:14px}.priority-heading h3{margin:4px 0 0;color:#eefaff;font-size:20px}.eyebrow{color:#5ed9ff;font-size:11px;letter-spacing:.22em}.priority-total{display:flex;align-items:baseline;gap:7px;color:#83b9d4}.priority-total strong{color:#f2c86f;font-size:28px}.priority-total span{font-size:12px}
.tag-ribbon{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}.tag-node{position:relative;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;min-height:78px;padding:10px 9px;border:1px solid rgba(74,156,205,.26);border-radius:9px;color:#cce9f8;text-align:left;background:rgba(9,35,61,.7);cursor:pointer;transition:.25s ease}.tag-node:hover,.tag-node.active{border-color:#55d7ff;background:linear-gradient(145deg,rgba(6,111,151,.72),rgba(10,49,81,.9));transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,145,200,.2)}.tag-node.active:before{position:absolute;inset:0 10px auto;height:2px;content:"";background:#67e3ff;box-shadow:0 0 14px #42d3ff}.tag-index{color:#4ea6cf;font:700 10px/1 monospace}.tag-copy{min-width:0}.tag-copy b{display:block;color:#f2fbff;font-size:12px;line-height:1.4}.tag-copy small{display:block;margin-top:5px;overflow:hidden;color:#76abc5;font-size:9px;white-space:nowrap;text-overflow:ellipsis}.tag-node em{color:#61dcff;font:700 22px/1 Georgia,serif;font-style:normal}
@keyframes scan{to{transform:translateX(80%)}}@media(max-width:1100px){.tag-ribbon{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.priority-heading{align-items:flex-start}.tag-ribbon{grid-template-columns:1fr}}
</style>
