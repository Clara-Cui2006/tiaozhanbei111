<template>
  <div class="legal-recommend-page" :class="{ 'theme-light': themeMode === 'light' }">
    <BackHome />
    <a-page-header title="普法方案" subtitle="Legal Recommend">
      <template #extra>
        <a-button type="primary" @click="openCreatePage">
          <template #icon><icon-plus /></template>
          新增普法方案
        </a-button>
      </template>
    </a-page-header>

    <div class="stats-banner">
      <span>📊 今日已为</span>
      <span class="counter-number">{{ animatedCounter }}</span>
      <span>个社区推送普法方案</span>
    </div>

    <a-card title="普法紧迫示意（12345 投诉关切热力）" :bordered="false" class="urgency-card">
      <p class="urgency-hint">
        动态红点表示关切强度（示意）：越密集、涟漪越大可优先覆盖普法；点击红点查看推荐物料链接。
      </p>
      <div v-if="!mapPoints.length" class="urgency-empty">暂无街区点位数据，稍后再试。</div>
      <div v-else ref="urgencyChartRef" class="urgency-chart" style="width: 100%; height: 240px"></div>
    </a-card>

    <a-modal
      v-model:visible="materialModalVisible"
      :title="`普法物料 — ${materialModalCommunity}`"
      :footer="false"
      width="480px"
      @cancel="materialModalVisible = false"
    >
      <ul class="material-list">
        <li v-for="(m, i) in materialModalLinks" :key="i">
          <a-link :href="m.url" target="_blank" rel="noopener noreferrer">{{ m.label }}</a-link>
        </li>
      </ul>
    </a-modal>

    <a-row :gutter="16">
      <a-col :span="18">
        <a-row :gutter="16">
          <a-col v-for="item in recommendList" :key="item.id" :span="8">
            <a-card :bordered="false" class="plan-card">
              <template #title>
                <div class="plan-title-row">
                  <span style="display: flex; align-items: center; gap: 8px;">
                    {{ item.title }}
                    <a-tag v-if="item.isManual" color="green" size="small">👤 手工新增</a-tag>
                    <a-tag v-else color="purple" size="small">🤖 AI 推荐</a-tag>
                  </span>
                  <a-tag v-if="item.pilotCommunities" color="arcoblue" size="small">已在{{ item.pilotCommunities }}个社区试点</a-tag>
                </div>
              </template>

              <div class="plan-tags">
                <a-tag v-for="tag in item.tags" :key="tag" :color="getTagColor(tag)" size="small">{{ tag }}</a-tag>
              </div>

              <div class="auto-note">{{ item.autoGenNote }}</div>

              <p>适用人群：{{ item.group }}</p>
              <p>触发场景：{{ item.scene }}</p>

              <div class="resource-row">
                <span v-for="res in item.resources" :key="res.label" class="resource-item" :title="res.label">
                  {{ res.icon }} x{{ res.count }}
                </span>
              </div>

              <div class="data-summary">
                <span>👥 覆盖: {{ item.coverageTarget.toLocaleString() }}+</span>
                <span>⏳ 周期: {{ item.durationDays }}天</span>
                <span v-if="item.approvalRate">⭐ 好评: {{ item.approvalRate }}%</span>
              </div>

              <a-space style="margin-top: 12px">
                <a-button type="primary" size="small" @click="handleUse(item)">采纳推送</a-button>
                <a-button size="small" @click="goPlan(item)">查看方案</a-button>
                <a-popconfirm content="确定要删除该普法方案吗？" type="warning" @ok="handleDelete(item)">
                  <a-button size="small" status="danger">删除</a-button>
                </a-popconfirm>
              </a-space>
            </a-card>
          </a-col>
        </a-row>
      </a-col>

      <a-col :span="6">
        <a-card title="推送统计" :bordered="false">
          <div class="stat-item">
            <span class="stat-label">普法方案投放总数</span>
            <span class="stat-value">{{ pushStats.totalPlans }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">线上推送次数</span>
            <span class="stat-value">{{ pushStats.onlinePushCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">线下活动次数</span>
            <span class="stat-value">{{ pushStats.offlineActivityCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">受众覆盖总量</span>
            <span class="stat-value">{{ pushStats.audienceCoverage.toLocaleString() }}</span>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { IconPlus } from '@arco-design/web-vue/es/icon'
import BackHome from '../components/back-home.vue'
import {
  fetchLegalRecommendationsV2,
  fetchLegalPushStats,
  adoptLegalRecommendation,
  fetchCommunityRiskPoints,
  deleteLegalRecommendation
} from '../api/platform'
import type { LegalRecommendationV2, LegalPushStats, CommunityRiskPoint } from '../types/platform'

const router = useRouter()
const recommendList = ref<any[]>([])
const pushStats = ref<LegalPushStats>({
  totalPlans: 0,
  onlinePushCount: 0,
  offlineActivityCount: 0,
  audienceCoverage: 0,
  todayPushCommunities: 0
})
const animatedCounter = ref(0)
let counterTimer: number | null = null

const mapPoints = ref<CommunityRiskPoint[]>([])
const urgencyChartRef = ref<HTMLDivElement | null>(null)
let urgencyChart: echarts.ECharts | null = null
const materialModalVisible = ref(false)
const materialModalCommunity = ref('')
const materialModalLinks = ref<{ label: string; url: string }[]>([])

const openCreatePage = () => {
  router.push('/legal-plan-form')
}

const isLightTheme = () => localStorage.getItem('platform:theme-mode') === 'light'
const themeMode = ref<'light' | 'dark'>(isLightTheme() ? 'light' : 'dark')

const updateTheme = () => { themeMode.value = isLightTheme() ? 'light' : 'dark' }
const handleStorageChange = (e: StorageEvent) => { if (e.key === 'platform:theme-mode') updateTheme() }

const getNormalizedXY = (lon: number, lat: number, points: CommunityRiskPoint[]): [number, number] => {
  if (!points.length) return [50, 50]
  const lons = points.map(p => p.longitude)
  const lats = points.map(p => p.latitude)
  const lonMin = Math.min(...lons)
  const lonMax = Math.max(...lons)
  const latMin = Math.min(...lats)
  const latMax = Math.max(...lats)
  const lonPadding = (lonMax - lonMin) * 0.02
  const latPadding = (latMax - latMin) * 0.02
  const effectiveLonMin = lonMin - lonPadding
  const effectiveLonMax = lonMax + lonPadding
  const effectiveLatMin = latMin - latPadding
  const effectiveLatMax = latMax + latPadding
  const x = ((lon - effectiveLonMin) / (effectiveLonMax - effectiveLonMin)) * 100
  const y = ((lat - effectiveLatMin) / (effectiveLatMax - effectiveLatMin)) * 100
  return [Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y))]
}

// ========== 修正后的强度计算公式 ==========
const complaintIntensity = (p: CommunityRiskPoint) => {
  // 按照实际数据的范围（annualCases大概在30~350）进行缩放
  const scaledCases = (p.annualCases || 0) * 0.2; 
  const scaledScore = (p.riskScore || 50) * 0.3;
  // 保证最终计算出来的数据在 10 ~ 100 之间，呈现出真实的大小差异
  return Math.round(Math.min(100, Math.max(10, scaledCases + scaledScore)));
}
// ==========================================

const defaultMaterials = (community: string) => [
  { label: `短视频｜${community}常见纠纷以案说法`, url: '#' },
  { label: '案例图文｜12345 高频问题法律解读', url: '#' },
  { label: '传单模板（示意下载）', url: '#' }
]

const renderUrgencyChart = () => {
  if (!urgencyChartRef.value || !mapPoints.value.length) return
  if (!urgencyChart) urgencyChart = echarts.init(urgencyChartRef.value)
  
  const lons = mapPoints.value.map(p => p.longitude)
  const lats = mapPoints.value.map(p => p.latitude)
  const lonMin = Math.min(...lons)
  const lonMax = Math.max(...lons)
  const latMin = Math.min(...lats)
  const latMax = Math.max(...lats)
  
  const data = mapPoints.value.map((p) => {
    const [x, y] = getNormalizedXY(p.longitude, p.latitude, mapPoints.value)
    const intensity = complaintIntensity(p)
    return { name: p.community, value: [x, y, intensity], symbolSize: 12 + intensity * 0.22 }
  })
  
  urgencyChart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 100, right: 12, top: 60, bottom: 40 },
    xAxis: {
      type: 'value', min: 0, max: 100,
      name: `西 → 东 (经度 ${lonMin.toFixed(3)} ~ ${lonMax.toFixed(3)})`,
      nameLocation: 'middle', nameGap: 22,
      nameTextStyle: { color: isLightTheme() ? '#1d4f79' : '#8ec7e8', fontSize: 11 },
      splitLine: { lineStyle: { color: isLightTheme() ? 'rgba(74, 140, 198, 0.15)' : 'rgba(98, 179, 255, 0.12)' } },
      axisLabel: { show: false }
    },
    yAxis: {
      type: 'value', min: 0, max: 100,
      name: `南 → 北 (纬度 ${latMin.toFixed(3)} ~ ${latMax.toFixed(3)})`,
      nameTextStyle: { color: isLightTheme() ? '#1d4f79' : '#8ec7e8', fontSize: 11 },
      nameGap: 28,
      splitLine: { lineStyle: { color: isLightTheme() ? 'rgba(74, 140, 198, 0.15)' : 'rgba(98, 179, 255, 0.12)' } },
      axisLabel: { show: false }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: { name?: string; value?: number[] }) => {
        const v = params.value as number[]
        return `${params.name}<br/>关切强度（示意）：${v[2] ?? 0}`
      }
    },
    series: [{
      type: 'effectScatter', coordinateSystem: 'cartesian2d', data,
      rippleEffect: { brushType: 'stroke', scale: 3.2, period: 2.6 },
      itemStyle: { color: '#f53f3f', shadowBlur: 12, shadowColor: 'rgba(245, 63, 63, 0.45)' }, zlevel: 1
    }]
  })
  
  urgencyChart.off('click')
  urgencyChart.on('click', (params: { name?: string }) => {
    materialModalCommunity.value = String(params.name || '')
    materialModalLinks.value = defaultMaterials(materialModalCommunity.value || '该街区')
    materialModalVisible.value = true
  })
}

const handleUrgencyResize = () => { urgencyChart?.resize() }

const getTagColor = (tag: string) => {
  const map: Record<string, string> = { '高发预警': 'red', '人群精准匹配': 'arcoblue', '近期热搜': 'orangered' }
  return map[tag] || 'blue'
}

const handleUse = async (item: any) => {
  await adoptLegalRecommendation(item.id)
  Message.success(`已采纳推荐：${item.title}`)
}

const goPlan = (item: any) => {
  const planId = item.planId || item.id
  router.push(`/legal-plan/${planId}`)
}

const handleDelete = async (item: any) => {
  try {
    await deleteLegalRecommendation(item.id)
    recommendList.value = recommendList.value.filter(p => p.id !== item.id)
    Message.success('删除成功')
  } catch (e) {
    Message.error('删除失败')
  }
}

onMounted(async () => {
  updateTheme()
  window.addEventListener('storage', handleStorageChange)

  const [recommendations, stats, points] = await Promise.all([
    fetchLegalRecommendationsV2(),
    fetchLegalPushStats(),
    fetchCommunityRiskPoints()
  ])
  recommendList.value = recommendations
  pushStats.value = stats
  mapPoints.value = points

  await nextTick()
  renderUrgencyChart()
  window.addEventListener('resize', handleUrgencyResize)

  const target = stats.todayPushCommunities
  if (target > 0) {
    const step = Math.max(1, Math.floor(target / 20))
    const interval = Math.floor(800 / Math.ceil(target / step))
    counterTimer = window.setInterval(() => {
      if (animatedCounter.value + step >= target) {
        animatedCounter.value = target
        if (counterTimer) clearInterval(counterTimer)
        counterTimer = null
      } else {
        animatedCounter.value += step
      }
    }, interval)
  }
})

onUnmounted(() => {
  if (counterTimer) clearInterval(counterTimer)
  window.removeEventListener('resize', handleUrgencyResize)
  window.removeEventListener('storage', handleStorageChange)
  urgencyChart?.dispose()
  urgencyChart = null
})
</script>

<style scoped>
.stats-banner { background: linear-gradient(90deg, rgba(79, 174, 255, 0.18), rgba(14, 34, 68, 0.65)); border: 1px solid rgba(98, 189, 255, 0.3); border-radius: 10px; color: #d8f2ff; font-size: 16px; text-align: center; margin-bottom: 16px; padding: 12px 20px; }
.counter-number { font-size: 28px; font-weight: bold; color: #5ad6ff; margin: 0 8px; text-shadow: 0 0 12px rgba(90, 214, 255, 0.6); }
.plan-tags { margin-bottom: 8px; display: flex; gap: 4px; flex-wrap: wrap; }
.auto-note { font-size: 12px; color: #8ec7e8; margin-bottom: 8px; font-style: italic; }
.resource-row { display: flex; gap: 12px; margin: 8px 0; font-size: 13px; color: #d8f2ff; }
.resource-item { cursor: default; }
.data-summary { display: flex; gap: 16px; font-size: 12px; color: #9fd4f2; flex-wrap: wrap; }
.stat-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed rgba(108, 192, 248, 0.2); }
.stat-label { color: #9fd4f2; font-size: 13px; }
.stat-value { color: #5ad6ff; font-weight: bold; font-size: 16px; }
.plan-title-row { display: flex; justify-content: space-between; align-items: center; }
.plan-card { margin-bottom: 16px; }
.urgency-card { margin-bottom: 16px; border: 1px solid rgba(93, 191, 255, 0.22); background: linear-gradient(180deg, rgba(14, 39, 78, 0.78), rgba(9, 24, 47, 0.86)); }
.urgency-card :deep(.arco-card-header-title) { color: #d8f3ff; }
.urgency-hint { margin: 0 0 10px; font-size: 12px; color: #8ec7e8; line-height: 1.55; }
.urgency-chart { width: 100%; height: 220px; }
.urgency-empty { color: #9fd4f2; font-size: 13px; padding: 24px 0; text-align: center; }
.material-list { margin: 0; padding-left: 18px; color: #d8f2ff; line-height: 1.9; }

:global(body.theme-light) .legal-recommend-page {
  :deep(.arco-page-header-title) { color: #0a2f4d !important; }
  :deep(.arco-page-header-sub-title) { color: #1e4f7a !important; }
  .stats-banner { background: linear-gradient(90deg, #e3f0ff, #f0f7ff) !important; border-color: #b8d4f0 !important; color: #1d4f79 !important; }
  .counter-number { color: #165dff !important; text-shadow: 0 0 8px rgba(22, 93, 255, 0.2) !important; }
  .plan-card { background: #ffffff !important; border-color: #cce0ff !important; }
  .urgency-card { background: #f5f9ff !important; border-color: #b8d4f0 !important; }
  .urgency-card :deep(.arco-card-header-title) { color: #0a2f4d !important; }
  .auto-note { color: #3a6685 !important; }
  .resource-row { color: #1d4f79 !important; }
  .data-summary { color: #2e628b !important; }
  .urgency-hint { color: #2e628b !important; }
  .urgency-empty { color: #4e7999 !important; }
  .stat-label { color: #1e4f7a !important; }
  .stat-value { color: #165dff !important; }
  .stat-item { border-bottom-color: rgba(70, 136, 192, 0.2) !important; }
  .material-list { color: #1d4f79 !important; }
  p { color: #1d2129 !important; }
  :deep(.arco-tag) { color: #1d2129 !important; }
  :deep(.arco-button:not(.arco-button-primary):not(.arco-btn-status-danger)) { background: #f2f3f5 !important; border-color: #c9cdd4 !important; color: #1d2129 !important; }
  :deep(.arco-button:not(.arco-button-primary):not(.arco-btn-status-danger):hover) { background: #e5e6eb !important; border-color: #86909c !important; }
  :deep(.arco-button-primary) { background: #165dff !important; color: #ffffff !important; }
}
</style>
