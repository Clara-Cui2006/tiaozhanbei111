<template>
  <div class="topic-tabs" :class="{ compact }">
    <button v-for="item in stats" :key="item.tag" type="button" :class="{ active: modelValue === item.tag }" @click="$emit('update:modelValue', item.tag)">
      <span>{{ item.tag }}</span><em>{{ item.count }}</em>
    </button>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { aggregatePriorityAlerts, type PriorityAlert, type PriorityTag } from '../features/priority-alerts'
const props = withDefaults(defineProps<{ modelValue: PriorityTag; alerts: PriorityAlert[]; compact?: boolean }>(), { compact: false })
defineEmits<{ 'update:modelValue': [value: PriorityTag] }>()
const stats = computed(() => aggregatePriorityAlerts(props.alerts))
</script>
<style scoped>
.topic-tabs{display:flex;flex-wrap:wrap;gap:9px}.topic-tabs button{display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border:1px solid rgba(255,129,86,.38);border-radius:4px;color:#ffd0b7;background:rgba(163,57,28,.14);cursor:pointer;transition:.2s}.topic-tabs button:hover,.topic-tabs button.active{border-color:#ff865d;color:#fff2e9;background:linear-gradient(135deg,rgba(188,54,29,.72),rgba(127,34,27,.56));box-shadow:0 0 15px rgba(255,101,62,.18)}.topic-tabs em{min-width:20px;padding:2px 5px;border-radius:9px;color:#ffe2ce;text-align:center;background:rgba(255,255,255,.1);font-size:10px;font-style:normal}.topic-tabs.compact{padding:10px 0;border-bottom:1px solid rgba(91,183,225,.14)}.topic-tabs.compact button{border-color:rgba(69,174,222,.3);color:#a9ddf5;background:rgba(15,76,109,.2)}.topic-tabs.compact button:hover,.topic-tabs.compact button.active{border-color:#4bcdfd;color:#ecfbff;background:linear-gradient(135deg,rgba(12,119,158,.68),rgba(11,61,94,.75));box-shadow:0 0 15px rgba(48,192,244,.16)}
</style>
