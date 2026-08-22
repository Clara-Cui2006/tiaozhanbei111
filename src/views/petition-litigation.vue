<template>
  <div class="petition-workspace">
    <a-spin :loading="loading" style="width: 100%">
      <a-alert v-if="errorMessage" type="error" closable>{{ errorMessage }}</a-alert>

      <template v-if="section === 'overview'">
        <section class="metric-grid">
          <div v-for="metric in metrics" :key="metric.label" class="metric-card" :class="metric.tone">
            <span>{{ metric.label }}</span><strong>{{ metric.value }}</strong>
          </div>
        </section>

        <div class="petition-dashboard-grid" :class="{ 'petition-dashboard-grid--focused': focusedPanel }">
          <DashboardFocusPanel v-model="focusedPanel" panel-key="map" title="西城区街道事项分布">
            <template #default="{ focused }">
              <RiskMapPanel :points="mapPoints" :height="focused ? 350 : 225" :display-mode="focused ? 'focus' : 'cockpit'" @street-change="selectStreet" />
            </template>
          </DashboardFocusPanel>
          <div class="petition-right-column">
            <DashboardFocusPanel v-model="focusedPanel" panel-key="items" title="涉访涉诉事项" hide-action>
              <template #header-extra>
                <span class="panel-count-badge">共 {{ filteredItems.length }} 条</span>
              </template>
              <ScrollItemList :items="filteredItems" @open="openItem" />
            </DashboardFocusPanel>
          </div>
        </div>
      </template>

      <template v-else-if="section === 'clues'">
        <DashboardFocusPanel v-model="focusedPanel" panel-key="categories" title="监督线索辅助分类">
        <section class="clue-category-grid">
          <button v-for="category in supervisionCategories" :key="category" type="button" :class="{ active: selectedSupervision === category }" @click="selectedSupervision = category">
            <span>{{ category }}</span><strong>{{ supervisionCount(category) }}</strong><small>辅助命中 · 待人工复核</small>
          </button>
        </section>
        </DashboardFocusPanel>

        <section v-if="selectedSupervision === '政治安全'" class="typical-panel tech-panel">
          <div class="panel-title"><span>政治安全典型事项</span><small>从全量命中事项中配置，不另建重复数据</small></div>
          <div class="typical-grid">
            <button v-for="item in typicalItems" :key="item.id" type="button" @click="openItem(item)">
              <a-tag color="orangered">典型事项</a-tag><strong>{{ item.eventName || item.conflictNo }}</strong><span>{{ item.summary }}</span>
            </button>
          </div>
        </section>

        <DashboardFocusPanel v-model="focusedPanel" panel-key="clue-items" title="监督线索事项"><ItemTable :items="clueItems" @open="openItem" /></DashboardFocusPanel>
      </template>

      <template v-else>
        <DashboardFocusPanel v-model="focusedPanel" panel-key="departments" title="反向审视部门概览">
        <section class="department-grid">
          <button v-for="department in departments" :key="department.id" type="button" :class="{ active: selectedDepartment === department.id }" @click="selectedDepartment = department.id">
            <span>{{ department.name }}</span><strong>{{ department.total }}</strong>
            <small>待核查 {{ department.pending }} · 已处理 {{ department.done }}</small>
          </button>
        </section>
        </DashboardFocusPanel>
        <div class="reverse-note">反向审视用于发现“群众反映—检察案件—内部业务部门”间的问题，不等同于一般外部监督线索。</div>
        <DashboardFocusPanel v-model="focusedPanel" panel-key="reverse-items" title="反向审视事项"><ItemTable :items="reverseItems" reverse @open="openItem" /></DashboardFocusPanel>
      </template>
    </a-spin>

    <a-drawer v-model:visible="drawerVisible" :width="720" unmount-on-close>
      <template #title>{{ selectedItem?.eventName || selectedItem?.conflictNo || '事项详情' }}</template>
      <template v-if="selectedItem">
        <DetailSection title="事项基本信息">
          <div class="detail-grid">
            <label>矛盾编号<strong>{{ selectedItem.conflictNo || '—' }}</strong></label><label>发生时间<strong>{{ selectedItem.occurredAt || '—' }}</strong></label>
            <label>事件来源<strong>{{ selectedItem.source || '—' }}</strong></label><label>风险等级<strong>{{ selectedItem.riskLevel || '—' }}</strong></label>
            <label>所属街道<strong>{{ selectedItem.street || '—' }}</strong></label><label>事件类别<strong>{{ selectedItem.eventCategory || '—' }}</strong></label>
          </div>
          <p class="detail-summary">{{ selectedItem.summary || '暂无事件简述' }}</p>
        </DetailSection>

        <DetailSection title="人物画像">
          <div class="privacy-switch"><span>敏感字段默认脱敏</span><a-switch v-model="showSensitive" checked-text="显示" unchecked-text="脱敏" /></div>
          <div class="detail-grid profile-grid">
            <label v-for="field in partyFields" :key="field.label">{{ field.label }}<strong>{{ field.value }}</strong></label>
          </div>
        </DetailSection>

        <DetailSection title="辅助研判">
          <div class="tag-row"><a-tag v-for="tag in selectedItem.aiTags || []" :key="tag" color="arcoblue">{{ tag }}</a-tag></div>
          <ul><li v-for="reason in selectedItem.aiReasons || []" :key="reason">{{ reason }}</li></ul>
          <div v-for="risk in selectedItem.riskAnalysis || []" :key="risk.label" class="risk-reason"><strong>{{ risk.label }}</strong><span>依据：{{ risk.basis }}</span></div>
          <h4>建议下一步意见</h4>
          <ul><li v-for="action in selectedItem.suggestedActions || []" :key="action">{{ action }}</li></ul>
          <a-alert type="warning">上述结果仅作辅助研判，不代表最终法律定性或风险评级。</a-alert>
        </DetailSection>

        <DetailSection v-if="selectedItem.reverseReview?.matched" title="反向审视核查">
          <div class="detail-grid">
            <label>关联部门<strong>{{ selectedItem.reverseReview.departmentName || '—' }}</strong></label><label>关联案件<strong>{{ selectedItem.reverseReview.relatedCaseId || '—' }}</strong></label>
            <label>可能环节<strong>{{ selectedItem.reverseReview.possibleStage || '—' }}</strong></label><label>当前状态<strong>{{ selectedItem.reverseReview.status || '—' }}</strong></label>
          </div>
          <p class="detail-summary">{{ selectedItem.reverseReview.issueSummary }}</p>
          <h4>建议核查方向</h4><ul><li v-for="item in selectedItem.reverseReview.suggestedCheck || []" :key="item">{{ item }}</li></ul>
          <div class="reserved-fields">已预留：处置意见 · 处置结果 · 反馈时间 · 责任部门</div>
        </DetailSection>
        <div class="drawer-actions">
          <a-button v-if="selectedItem.supervisionCategories?.includes('政治安全')" @click="goPolitical">转政治安全专题</a-button>
          <a-button type="primary" :disabled="selectedItem.reviewStatus !== '已确认'" @click="goProcuratorial">转入检察履职</a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, onUnmounted, reactive, ref, resolveComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RiskMapPanel from '../components/risk-map-panel.vue'
import DashboardFocusPanel from '../components/dashboard-focus-panel.vue'
import { fetchPetitionLitigationItems } from '../api/platform'
import { countPetitionValues, filterPetitionItems } from '../features/petition-litigation/model'
import type { PetitionLitigationItem, PetitionRiskLevel, SupervisionCategory } from '../types/platform'

const route = useRoute()
const router = useRouter()
const section = computed(() => String(route.params.section || 'overview'))
const riskLevels: PetitionRiskLevel[] = ['蓝色', '黄色', '橙色', '红色']
const sourceOptions = ['群众来访', '市级交办', '12345热线', '综治中心', '网格员上报', '电话', '网格', '110非警务警情', '部门流转', '下级上报']
const eventCategoryOptions = ['邻里关系', '其他', '物业纠纷', '涉法涉诉', '欠资欠薪', '婚恋家庭', '房地产纠纷', '交通运输', '医疗卫生', '征地拆迁', '债务纠纷', '经济金融', '涉校纠纷', '劳动就业', '重点信访事项', '山林土地', '宅基地', '行政争议']
const supervisionCategories: SupervisionCategory[] = ['刑事检察', '民事检察', '行政检察', '公益诉讼检察', '未成年人检察', '政治安全']
const items = ref<PetitionLitigationItem[]>([])
const loading = ref(false)
const errorMessage = ref('')
const dateRange = ref<string[]>([])
const filters = reactive({ street: '', source: '', riskLevel: '' as PetitionRiskLevel | '', eventCategory: '', keyword: '' })
const selectedSupervision = ref<SupervisionCategory>('刑事检察')
const selectedDepartment = ref('all')
const drawerVisible = ref(false)
const selectedItem = ref<PetitionLitigationItem | null>(null)
const showSensitive = ref(false)
const focusedPanel = ref('')

const filteredItems = computed(() => items.value)
const countBy = (key: 'riskLevel' | 'source' | 'eventCategory') => countPetitionValues(filteredItems.value, key)
const riskDistribution = computed(() => riskLevels.map((name) => countBy('riskLevel').find((item) => item.name === name) || { name, value: 0, percent: 0 }))
const sourceDistribution = computed(() => countBy('source'))
const categoryDistribution = computed(() => countBy('eventCategory'))
const supervisionCount = (category: SupervisionCategory) => filteredItems.value.filter((item) => item.supervisionCategories?.includes(category)).length
const clueItems = computed(() => filteredItems.value.filter((item) => item.supervisionCategories?.includes(selectedSupervision.value)))
const typicalItems = computed(() => clueItems.value.filter((item) => item.typical).slice(0, 2))
const reverseBase = computed(() => filteredItems.value.filter((item) => item.reverseReview?.matched))
const departments = computed(() => {
  const result = new Map<string, { id: string; name: string; total: number; pending: number; done: number }>()
  reverseBase.value.forEach((item) => {
    const id = item.reverseReview?.departmentId || 'unassigned'; const name = item.reverseReview?.departmentName || '待分派部门'
    const current = result.get(id) || { id, name, total: 0, pending: 0, done: 0 }
    current.total += 1
    if (item.reverseReview?.status === '已处理') current.done += 1; else current.pending += 1
    result.set(id, current)
  })
  const all = [...result.values()]
  return [{ id: 'all', name: '全部业务部门', total: reverseBase.value.length, pending: reverseBase.value.filter((item) => item.reverseReview?.status !== '已处理').length, done: reverseBase.value.filter((item) => item.reverseReview?.status === '已处理').length }, ...all]
})
const reverseItems = computed(() => reverseBase.value.filter((item) => selectedDepartment.value === 'all' || item.reverseReview?.departmentId === selectedDepartment.value))
const mapPoints = computed(() => [...new Set(items.value.map((item) => item.street).filter(Boolean))].map((street) => ({ community: street, annualCases: filteredItems.value.filter((item) => item.street === street).length })))
const metrics = computed(() => [
  { label: '事项总量', value: filteredItems.value.length, hint: '全量数据', tone: 'cyan' },
  { label: '重大风险事项', value: filteredItems.value.filter((item) => item.riskLevel === '红色').length, hint: '最高风险等级', tone: 'red' },
  { label: '较大风险事项', value: filteredItems.value.filter((item) => ['橙色'].includes(item.riskLevel || '')).length, hint: '高风险事项', tone: 'orange' },
  { label: '重点信访事项', value: filteredItems.value.filter((item) => item.eventCategory === '重点信访事项').length, hint: '重复、越级等事项', tone: 'yellow' },
  { label: '监督线索', value: filteredItems.value.filter((item) => item.supervisionCategories?.length).length, hint: '辅助识别并待复核', tone: 'blue' },
  { label: '政治安全关联', value: supervisionCount('政治安全'), hint: '可转专题继续研判', tone: 'purple' }
])

const riskColor = (name?: string) => ({ '蓝色': '#2f8dff', '黄色': '#f2c94c', '橙色': '#ff922b', '红色': '#ff5252' }[name || ''] || '#5ed9ff')
const selectStreet = (street: string) => { filters.street = street }
const openItem = (item: PetitionLitigationItem) => { selectedItem.value = item; showSensitive.value = false; drawerVisible.value = true }
const goPolitical = () => selectedItem.value && router.push({ path: '/political-security', query: { petitionItem: selectedItem.value.id } })
const goProcuratorial = () => selectedItem.value && router.push({ path: '/procuratorate-suggestion', query: { sourceItem: selectedItem.value.id } })
const mask = (value?: string) => {
  if (!value) return '—'
  if (showSensitive.value || /[*某]|脱敏/.test(value)) return value
  return `${value.slice(0, 2)}****${value.slice(-2)}`
}
const partyFields = computed(() => {
  const party = selectedItem.value?.party || {}
  return [
    ['当事人姓名', mask(party.name)], ['当事人电话', mask(party.phone)], ['当事人身份证', mask(party.idCard)], ['当事人年龄', party.age ?? '—'],
    ['当事人性别', party.gender || '—'], ['当事人民族', party.ethnicity || '—'], ['现住地区划', party.currentRegion || '—'], ['当事人住址', mask(party.address)],
    ['当事人户籍地', party.householdRegion || '—'], ['户籍详细地址', mask(party.householdAddress)], ['当事人工作单位', party.employer || '—']
  ].map(([label, value]) => ({ label, value: String(value) }))
})

const DetailSection = defineComponent({ props: { title: { type: String, required: true } }, setup(props, { slots }) { return () => h('section', { class: 'drawer-section' }, [h('h3', props.title), slots.default?.()]) } })
const ScrollItemList = defineComponent({
  props: { items: { type: Array as () => PetitionLitigationItem[], required: true } }, emits: ['open'],
  setup(props, { emit }) {
    const scrollRef = ref<HTMLElement>()
    const trackRef = ref<HTMLElement>()
    let timer: ReturnType<typeof setInterval> | null = null
    const paused = ref(false)
    let offset = 0

    const renderRow = (item: PetitionLitigationItem) => h('div', { class: 'scroll-table-row', onClick: () => emit('open', item) }, [
      h('span', { class: 'scroll-cell', style: { width: '160px' } }, item.occurredAt || '—'),
      h('span', { class: 'scroll-cell', style: { width: '105px' } }, [h('span', { class: 'table-risk-light', style: { display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: riskColor(item.riskLevel), border: `2px solid ${riskColor(item.riskLevel)}` }, title: item.riskLevel, 'aria-label': `${item.riskLevel}风险` }), h('span', { style: { marginLeft: '6px' } }, item.riskLevel || '—')]),
      h('span', { class: 'scroll-cell', style: { width: '145px' } }, item.street || '—'),
      h('span', { class: 'scroll-cell', style: { width: '135px' } }, item.eventCategory || '—'),
      h('span', { class: 'scroll-cell', style: { width: '90px' } }, [h(resolveComponent('a-button') as any, { type: 'text', size: 'small', onClick: (e: Event) => { e.stopPropagation(); emit('open', item) } }, () => '查看详情')])
    ])

    onMounted(() => {
      timer = setInterval(() => {
        if (paused.value || !trackRef.value) return
        offset += 0.5
        const halfHeight = trackRef.value.scrollHeight / 2
        if (offset >= halfHeight) offset = 0
        trackRef.value.style.transform = `translateY(-${offset}px)`
      }, 30)
    })
    onUnmounted(() => { if (timer) clearInterval(timer) })

    return () => h('section', { class: 'tech-panel scroll-table-panel' }, [
      h('div', {
        class: 'scroll-table-body',
        ref: scrollRef,
        onmouseenter: () => { paused.value = true },
        onmouseleave: () => { paused.value = false }
      }, [
        h('div', { class: 'scroll-table-track', ref: trackRef }, [
          ...props.items.map(renderRow),
          ...props.items.map(renderRow)
        ])
      ])
    ])
  }
})
const ItemTable = defineComponent({
  props: { items: { type: Array as () => PetitionLitigationItem[], required: true }, reverse: Boolean }, emits: ['open'],
  setup(props, { emit }) {
    const columns = computed(() => [
      { title: '来源事项', dataIndex: 'conflictNo', width: 150 }, { title: '发生时间', dataIndex: 'occurredAt', width: 160 }, { title: '关联部门', dataIndex: 'reverseReview.departmentName', width: 150 },
      { title: '问题摘要', dataIndex: 'reverseReview.issueSummary', ellipsis: true, tooltip: true }, { title: '状态', dataIndex: 'reverseReview.status', width: 100 }, { title: '操作', slotName: 'action', width: 90 }
    ])
    return () => h('section', { class: 'tech-panel table-panel' }, [h(resolveComponent('a-table') as any, { columns: columns.value, data: props.items, pagination: { pageSize: 8 }, rowKey: 'id', scroll: { x: 1000, y: focusedPanel.value.includes('items') ? 420 : 395 } }, { action: ({ record }: any) => h(resolveComponent('a-button') as any, { type: 'text', size: 'small', onClick: () => emit('open', record) }, () => '查看详情') })])
  }
})

onMounted(async () => {
  loading.value = true
  try { items.value = await fetchPetitionLitigationItems() } catch (error) { errorMessage.value = error instanceof Error ? error.message : '涉访涉诉数据加载失败' } finally { loading.value = false }
})
</script>

<style scoped>
.petition-workspace{min-height:100%;padding:22px 26px 40px;color:#eaf8ff;background:radial-gradient(circle at 50% 0,rgba(17,91,142,.18),transparent 38%),#031124}.workspace-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:16px;padding:18px 22px;border:1px solid rgba(65,202,255,.22);background:linear-gradient(135deg,rgba(10,57,96,.74),rgba(3,23,48,.84))}.workspace-heading p,.workspace-heading h1{margin:0}.workspace-heading p{color:#56dbff;font-size:13px;letter-spacing:2px}.workspace-heading h1{margin:5px 0;font-size:28px}.workspace-heading span{color:#8fb4c9}.filter-panel{position:sticky;top:86px;z-index:20;display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px;padding:13px;border:1px solid rgba(60,180,231,.2);background:rgba(4,23,45,.96);box-shadow:0 8px 22px rgba(0,0,0,.18)}.metric-grid,.clue-category-grid,.department-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin-bottom:16px}.metric-card,.clue-category-grid button,.department-grid button{display:flex;min-height:104px;flex-direction:column;align-items:flex-start;justify-content:center;padding:16px;border:1px solid rgba(74,185,226,.23);color:#dff7ff;text-align:left;background:linear-gradient(145deg,rgba(10,48,82,.84),rgba(3,24,49,.88));cursor:pointer}.metric-card:hover,.clue-category-grid button:hover,.clue-category-grid button.active,.department-grid button:hover,.department-grid button.active{border-color:#36d8ff;box-shadow:0 0 18px rgba(32,215,255,.13);transform:translateY(-1px)}.metric-card strong,.clue-category-grid strong,.department-grid strong{margin:4px 0;color:#54e3ff;font-size:30px}.metric-card small,.clue-category-grid small,.department-grid small{color:#769eb6}.metric-card.red strong{color:#ff6969}.metric-card.orange strong{color:#ff9e44}.metric-card.yellow strong{color:#f1d36b}.metric-card.purple strong{color:#b78bff}.overview-grid{display:grid;grid-template-columns:minmax(0,1.85fr) minmax(300px,.75fr);gap:14px;margin-bottom:16px}.tech-panel{border:1px solid rgba(65,190,236,.2);background:linear-gradient(145deg,rgba(5,31,59,.9),rgba(3,20,41,.94));box-shadow:inset 0 0 24px rgba(15,122,177,.05)}.map-panel{min-width:0}.structure-column{display:flex;flex-direction:column;gap:14px}.compact-panel{padding:14px}.panel-title{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(74,176,218,.15)}.panel-title span{font-size:17px;font-weight:700}.panel-title small{color:#7ba6bc}.distribution-row,.bar-row{display:flex;width:100%;align-items:center;gap:9px;padding:8px 3px;border:0;color:#ccecff;background:transparent;cursor:pointer}.distribution-row i{width:9px;height:9px;border-radius:50%}.distribution-row span{flex:1;text-align:left}.distribution-row em,.bar-row em{color:#7eacc2;font-style:normal}.bar-row span{width:88px;text-align:left}.bar-row i{height:6px;flex:1;overflow:hidden;border-radius:8px;background:rgba(66,132,164,.17)}.bar-row i b{display:block;height:100%;border-radius:8px;background:linear-gradient(90deg,#127fc5,#42e6ff)}.category-tags{display:flex;gap:8px;flex-wrap:wrap;padding-top:10px}.category-tags button{padding:7px 10px;border:1px solid rgba(70,171,216,.2);border-radius:3px;color:#afd7e8;background:rgba(9,57,91,.44);cursor:pointer}.category-tags b{color:#52e5ff}.table-panel{margin-top:16px;overflow:hidden}.typical-panel{margin-bottom:16px}.typical-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:14px}.typical-grid button{display:flex;gap:8px;flex-direction:column;align-items:flex-start;padding:16px;border:1px solid rgba(255,137,66,.3);color:#dff7ff;text-align:left;background:rgba(76,39,20,.2);cursor:pointer}.typical-grid button span:last-child{color:#9fc0cf}.reverse-note{margin-bottom:12px;padding:12px 15px;border-left:3px solid #4bdcff;color:#9cc5d8;background:rgba(20,93,131,.14)}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.detail-grid label{display:flex;gap:5px;flex-direction:column;padding:10px;color:#7aa4ba;background:rgba(7,43,71,.36)}.detail-grid strong{color:#e8f8ff}.drawer-section{margin-bottom:16px;padding:14px;border:1px solid rgba(70,171,216,.2);background:rgba(5,28,52,.48)}.drawer-section h3{margin:0 0 12px;color:#4edfff}.detail-summary{padding:12px;color:#c8e7f4;line-height:1.7;background:rgba(6,36,61,.55)}.privacy-switch{display:flex;justify-content:space-between;margin-bottom:10px;color:#8cb1c4}.tag-row{display:flex;gap:8px;flex-wrap:wrap}.drawer-section li{margin:7px 0;color:#badbe8}.risk-reason{display:flex;gap:5px;flex-direction:column;margin:9px 0;padding:10px;border-left:2px solid #36dcff;background:rgba(10,65,99,.28)}.risk-reason span{color:#91b8ca}.reserved-fields{padding:10px;color:#70bedc;border:1px dashed rgba(74,203,245,.28)}.drawer-actions{position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:10px;padding:14px;border-top:1px solid rgba(75,190,232,.2);background:rgba(3,18,35,.96)}
@media(max-width:1440px){.petition-workspace{padding:18px}.metric-grid,.clue-category-grid,.department-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.overview-grid{grid-template-columns:minmax(0,1.55fr) minmax(280px,.75fr)}}
@media(max-width:900px){.overview-grid{grid-template-columns:1fr}.metric-grid,.clue-category-grid,.department-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.workspace-heading{align-items:flex-start;gap:12px;flex-direction:column}.detail-grid,.typical-grid{grid-template-columns:1fr}}

.petition-workspace {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  overflow: hidden;
}

.petition-workspace .filter-panel {
  position: static;
  min-height: 42px;
  flex: 0 0 42px;
  flex-wrap: nowrap;
  margin: 0;
  padding: 4px 7px;
}

.petition-workspace :deep(.arco-spin) {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.petition-workspace .metric-grid {
  min-height: 92px;
  flex: 0 0 92px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin: 0 0 8px;
}
.petition-workspace .metric-card {
  --kpi-accent: #64d8ff;
  min-height: 0;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--kpi-accent) 40%, transparent);
  border-radius: 10px;
  background:
    radial-gradient(circle at 92% 86%, color-mix(in srgb, var(--kpi-accent) 13%, transparent), transparent 28%),
    linear-gradient(145deg, color-mix(in srgb, var(--kpi-accent) 14%, transparent), transparent 50%),
    linear-gradient(180deg, rgba(14, 39, 65, 0.84), rgba(7, 23, 40, 0.92));
  box-shadow:
    inset 0 0 26px color-mix(in srgb, var(--kpi-accent) 7%, transparent),
    0 14px 28px rgba(0, 0, 0, 0.18);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.petition-workspace .metric-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--kpi-accent) 58%, transparent);
  box-shadow:
    inset 0 0 28px color-mix(in srgb, var(--kpi-accent) 10%, transparent),
    0 16px 30px rgba(0, 0, 0, 0.22),
    0 0 22px color-mix(in srgb, var(--kpi-accent) 14%, transparent);
}
.petition-workspace .metric-card.red { --kpi-accent: #ff726b; }
.petition-workspace .metric-card.cyan { --kpi-accent: #64d8ff; }
.petition-workspace .metric-card.orange { --kpi-accent: #ff9b52; }
.petition-workspace .metric-card.yellow { --kpi-accent: #f2c86f; }
.petition-workspace .metric-card.blue { --kpi-accent: #5b9fd4; }
.petition-workspace .metric-card.purple { --kpi-accent: #b78bff; }
.petition-workspace .metric-card span {
  position: relative;
  z-index: 1;
  margin-bottom: 6px;
  padding: 0 10px;
  color: color-mix(in srgb, var(--kpi-accent) 72%, #d9edf4);
  font-size: 24px;
  font-weight: 800;
  line-height: 1.25;
  text-shadow: 0 0 10px color-mix(in srgb, var(--kpi-accent) 22%, transparent);
}
.petition-workspace .metric-card strong {
  position: relative;
  z-index: 1;
  padding: 0 16px;
  margin: 0;
  color: var(--kpi-accent);
  font-size: 27px;
  font-weight: 800;
  line-height: 1;
  text-align: center;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 17px color-mix(in srgb, var(--kpi-accent) 50%, transparent);
}

.petition-dashboard-grid {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 8px;
  overflow: hidden;
}
.petition-dashboard-grid > :first-child { grid-column: 1; grid-row: 1; }
.petition-dashboard-grid > :nth-child(2) { grid-column: 2; grid-row: 1; }
.petition-right-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 8px;
  overflow: hidden;
}
.petition-right-column > :first-child { flex: 1; min-height: 0; }
.petition-dashboard-grid .compact-panel { min-height: 0; padding: 7px; overflow: auto; }
.petition-dashboard-grid .compact-panel .panel-title { padding: 4px 6px; }
.petition-dashboard-grid .distribution-row { padding: 4px 2px; }
.petition-dashboard-grid .table-panel { height: 100%; margin: 0; border: 0; }
.petition-dashboard-grid .table-panel > .panel-title { display: none; }
.petition-dashboard-grid > :nth-child(2) :deep(.arco-table-td) { padding-top: 14px; padding-bottom: 14px; }

.petition-workspace > :deep(.arco-spin) > .focus-panel,
.petition-workspace > :deep(.arco-spin) > .typical-panel,
.petition-workspace > :deep(.arco-spin) > .reverse-note {
  margin-bottom: 8px;
}

.petition-workspace > :deep(.arco-spin) > .focus-panel:last-of-type { flex: 1; }
.petition-workspace .clue-category-grid,
.petition-workspace .department-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; margin: 0; padding: 8px; }
.petition-workspace .clue-category-grid button,
.petition-workspace .department-grid button { min-height: 72px; padding: 8px; }
.petition-workspace .clue-category-grid strong,
.petition-workspace .department-grid strong { font-size: 22px; }
.table-risk-light { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.45); border-radius: 50%; }
.panel-count-badge {
  font-size: 12px;
  color: rgba(159, 234, 255, 0.85);
  background: rgba(10, 69, 106, 0.55);
  border: 1px solid rgba(78, 215, 255, 0.3);
  border-radius: 4px;
  padding: 2px 10px;
  white-space: nowrap;
}
.petition-dashboard-grid :deep(.scroll-table-panel) {
  height: 100%;
  min-height: 0;
  margin: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.petition-dashboard-grid :deep(.scroll-table-body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.petition-dashboard-grid :deep(.scroll-table-track) {
  will-change: transform;
}
.petition-dashboard-grid :deep(.scroll-table-row) {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(74, 176, 218, 0.12);
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 6px;
}
.petition-dashboard-grid :deep(.scroll-table-row:hover) {
  background: rgba(30, 100, 150, 0.15);
}
.petition-dashboard-grid :deep(.scroll-cell) {
  display: inline-flex;
  align-items: center;
  font-size: 16px;
  color: #ccecff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 16px;
}
.petition-workspace :deep(.arco-card:has(canvas)::after) {
  display: none;
}
</style>
