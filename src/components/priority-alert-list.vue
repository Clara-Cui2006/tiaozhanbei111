<template>
  <section class="alert-board">
    <div class="board-summary">
      <div><span>当前专题</span><strong>{{ tag }}</strong></div>
      <div><span>预警案件</span><strong>{{ filtered.length }}</strong></div>
      <div><span>高发街道</span><strong>{{ topStreet }}</strong></div>
      <div><span>待人工复核</span><strong>{{ pendingCount }}</strong></div>
    </div>
    <div v-if="compact" class="compact-list">
      <button v-for="item in filtered.slice(0, limit)" :key="item.id" class="compact-item" @click="open(item.id)">
        <span class="risk-light" :class="`risk-${item.riskLevel}`"></span>
        <span><b>{{ item.caseName }}</b><small>{{ item.street }} · {{ item.caseType }}</small></span>
        <em>{{ item.alertStatus }}</em><i>查看 →</i>
      </button>
    </div>
    <div v-else class="case-grid">
      <article v-for="item in filtered" :key="item.id" class="case-ticket" @click="open(item.id)">
        <div class="ticket-top"><span class="risk-badge" :class="`risk-${item.riskLevel}`">{{ item.riskLevel }}风险</span><span class="review-badge">{{ item.alertStatus }}</span></div>
        <h4>{{ item.caseName }}</h4><p class="case-no">{{ item.caseNumber }}</p>
        <div class="case-meta"><span>{{ item.street }}</span><span>{{ item.caseType }}</span></div>
        <div class="case-tags"><span v-for="label in item.tags" :key="label">{{ label }}</span></div>
        <p class="case-summary">{{ item.summary }}</p>
        <footer><span>AI 辅助置信度 <b>{{ item.confidence }}%</b></span><button type="button">进入案件画像 →</button></footer>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { PriorityAlert, PriorityTag } from '../features/priority-alerts'
const props = withDefaults(defineProps<{ alerts: PriorityAlert[]; tag: PriorityTag; compact?: boolean; limit?: number }>(), { compact: false, limit: 5 })
const router = useRouter()
const filtered = computed(() => props.alerts.filter((item) => item.tags.includes(props.tag)))
const topStreet = computed(() => { const c:Record<string,number>={};filtered.value.forEach(i=>c[i.street]=(c[i.street]||0)+1);return Object.entries(c).sort((a,b)=>b[1]-a[1])[0]?.[0]||'暂无' })
const pendingCount = computed(() => filtered.value.filter((item) => item.alertStatus === '待人工复核').length)
const open = (id:number) => router.push(`/case-detail/${id}`)
</script>

<style scoped>
.alert-board{color:#dff5ff}.board-summary{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:10px;margin:12px 0}.board-summary>div{padding:13px 16px;border:1px solid rgba(91,185,238,.2);border-radius:8px;background:rgba(5,27,51,.78)}.board-summary span{display:block;color:#72a8c4;font-size:11px}.board-summary strong{display:block;margin-top:5px;color:#f5fbff;font-size:17px}.case-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.case-ticket{position:relative;padding:17px;border:1px solid rgba(78,161,210,.25);border-radius:11px;background:linear-gradient(145deg,rgba(11,40,68,.94),rgba(5,23,42,.92));cursor:pointer;transition:.25s}.case-ticket:hover{border-color:#57d8ff;transform:translateY(-3px);box-shadow:0 15px 34px rgba(0,0,0,.24)}.ticket-top{display:flex;justify-content:space-between;gap:8px}.risk-badge,.review-badge{padding:3px 8px;border-radius:99px;font-size:10px}.risk-高{color:#ff857f;background:rgba(255,84,75,.14)}.risk-中{color:#ffd074;background:rgba(241,174,60,.14)}.risk-低{color:#55dca8;background:rgba(48,196,143,.14)}.review-badge{color:#72dfff;border:1px solid rgba(78,205,255,.28)}h4{margin:12px 0 3px;color:#f3fbff;font-size:18px}.case-no{margin:0;color:#6da1bd;font:11px monospace}.case-meta{display:flex;gap:8px;margin:12px 0;color:#b6d8e9;font-size:12px}.case-meta span{padding-right:8px;border-right:1px solid rgba(116,184,219,.22)}.case-tags{display:flex;flex-wrap:wrap;gap:5px}.case-tags span{padding:3px 6px;border:1px solid rgba(77,186,235,.25);border-radius:3px;color:#73cdf1;font-size:9px}.case-summary{display:-webkit-box;min-height:42px;margin:11px 0;overflow:hidden;color:#a9cadb;font-size:12px;line-height:1.7;-webkit-line-clamp:2;-webkit-box-orient:vertical}.case-ticket footer{display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid rgba(98,166,203,.14);color:#709db5;font-size:10px}.case-ticket footer b{color:#55dcff}.case-ticket footer button{border:0;color:#70dfff;background:none;cursor:pointer}.compact-list{display:grid;gap:8px}.compact-item{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:11px;width:100%;padding:12px 14px;border:1px solid rgba(71,154,203,.22);border-radius:8px;color:#dff4ff;text-align:left;background:rgba(6,28,51,.82);cursor:pointer}.compact-item:hover{border-color:#54d5ff;background:rgba(9,55,87,.88)}.risk-light{width:7px;height:30px;border-radius:8px}.compact-item span b,.compact-item span small{display:block}.compact-item span small{margin-top:3px;color:#6f9eb7;font-size:10px}.compact-item em{color:#f2c86f;font-size:10px;font-style:normal}.compact-item i{color:#57d9ff;font-size:11px;font-style:normal}@media(max-width:800px){.board-summary{grid-template-columns:1fr 1fr}.case-grid{grid-template-columns:1fr}.compact-item{grid-template-columns:auto 1fr}.compact-item em,.compact-item i{display:none}}
</style>
