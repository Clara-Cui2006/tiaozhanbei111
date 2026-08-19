<template>
  <div class="petition-workspace">
    <header class="workspace-heading">
      <div>
        <p>涉访涉诉 · 前置研判工作区</p>
        <h1>{{ sectionTitle }}</h1>
        <span>{{ sectionDescription }}</span>
      </div>
      <a-tag color="arcoblue">AI 仅作辅助研判，结果须人工复核</a-tag>
    </header>

    <section class="filter-panel">
      <a-range-picker v-model="dateRange" value-format="YYYY-MM-DD" style="width: 240px" />
      <a-select v-model="filters.street" allow-clear placeholder="所属街道" style="width: 170px">
        <a-option v-for="item in streetOptions" :key="item" :value="item">{{ item }}</a-option>
      </a-select>
      <a-select v-model="filters.source" allow-clear placeholder="事件来源" style="width: 150px">
        <a-option v-for="item in sourceOptions" :key="item" :value="item">{{ item }}</a-option>
      </a-select>
      <a-select v-model="filters.riskLevel" allow-clear placeholder="风险等级" style="width: 130px">
        <a-option v-for="item in riskLevels" :key="item" :value="item">{{ item }}</a-option>
      </a-select>
      <a-select v-model="filters.eventCategory" allow-clear placeholder="事件类别" style="width: 170px">
        <a-option v-for="item in eventCategoryOptions" :key="item" :value="item">{{ item }}</a-option>
      </a-select>
      <a-input-search v-model="filters.keyword" allow-clear placeholder="编号、简述或标签" style="min-width: 210px; flex: 1" />
      <a-button @click="clearFilters">清空筛选</a-button>
    </section>

    <a-spin :loading="loading" style="width: 100%">
      <a-alert v-if="errorMessage" type="error" closable>{{ errorMessage }}</a-alert>

      <template v-if="section === 'overview'">
        <section class="metric-grid">
          <button v-for="metric in metrics" :key="metric.label" type="button" class="metric-card" :class="metric.tone" @click="metric.action?.()">
            <span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.hint }}</small>
          </button>
        </section>

        <div class="petition-dashboard-grid" :class="{ 'petition-dashboard-grid--focused': focusedPanel }">
          <DashboardFocusPanel v-model="focusedPanel" panel-key="map" title="西城区街道事项分布" eyebrow="12345 · 综治中心">
            <template #default="{ focused }">
              <RiskMapPanel :points="mapPoints" :height="focused ? 350 : 225" :display-mode="focused ? 'focus' : 'cockpit'" @street-change="selectStreet" />
            </template>
          </DashboardFocusPanel>
          <DashboardFocusPanel v-model="focusedPanel" panel-key="structure" title="事项结构" eyebrow="RISK · SOURCE · CATEGORY">
            <div class="structure-column">
            <div class="tech-panel compact-panel">
              <div class="panel-title"><span>风险等级结构</span><small>可点击筛选</small></div>
              <button v-for="item in riskDistribution" :key="item.name" type="button" class="distribution-row" @click="selectRisk(item.name)">
                <i :style="{ background: riskColor(item.name) }"></i><span>{{ item.name }}</span><b>{{ item.value }}</b><em>{{ item.percent }}%</em>
              </button>
            </div>
            <div class="tech-panel compact-panel">
              <div class="panel-title"><span>事件来源结构</span><small>当前筛选口径</small></div>
              <button v-for="item in sourceDistribution.slice(0, 6)" :key="item.name" type="button" class="bar-row" @click="filters.source = item.name">
                <span>{{ item.name }}</span><i><b :style="{ width: `${item.percent}%` }"></b></i><em>{{ item.value }}</em>
              </button>
            </div>
            <div class="tech-panel compact-panel">
              <div class="panel-title"><span>事件类别</span><small>只展示当前有数据类别</small></div>
              <div class="category-tags">
                <button v-for="item in categoryDistribution" :key="item.name" type="button" @click="filters.eventCategory = item.name">{{ item.name }} <b>{{ item.value }}</b></button>
              </div>
            </div>
            </div>
          </DashboardFocusPanel>
          <DashboardFocusPanel v-model="focusedPanel" panel-key="items" title="涉访涉诉事项" eyebrow="HUMAN REVIEW REQUIRED">
            <ItemTable :items="filteredItems" @open="openItem" />
          </DashboardFocusPanel>
        </div>
      </template>

      <template v-else-if="section === 'clues'">
        <DashboardFocusPanel v-model="focusedPanel" panel-key="categories" title="监督线索辅助分类" eyebrow="CLUE SCREENING">
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

        <DashboardFocusPanel v-model="focusedPanel" panel-key="clue-items" title="监督线索事项" eyebrow="HUMAN REVIEW REQUIRED"><ItemTable :items="clueItems" @open="openItem" /></DashboardFocusPanel>
      </template>

      <template v-else>
        <DashboardFocusPanel v-model="focusedPanel" panel-key="departments" title="反向审视部门概览" eyebrow="REVERSE REVIEW">
        <section class="department-grid">
          <button v-for="department in departments" :key="department.id" type="button" :class="{ active: selectedDepartment === department.id }" @click="selectedDepartment = department.id">
            <span>{{ department.name }}</span><strong>{{ department.total }}</strong>
            <small>待核查 {{ department.pending }} · 已处理 {{ department.done }}</small>
          </button>
        </section>
        </DashboardFocusPanel>
        <div class="reverse-note">反向审视用于发现“群众反映—检察案件—内部业务部门”间的问题，不等同于一般外部监督线索。</div>
        <DashboardFocusPanel v-model="focusedPanel" panel-key="reverse-items" title="反向审视事项" eyebrow="INTERNAL REVIEW"><ItemTable :items="reverseItems" reverse @open="openItem" /></DashboardFocusPanel>
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

        <DetailSection title="AI 辅助研判">
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
import { computed, defineComponent, h, onMounted, reactive, ref, resolveComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RiskMapPanel from '../components/risk-map-panel.vue'
import DashboardFocusPanel from '../components/dashboard-focus-panel.vue'
import { fetchPetitionLitigationItems } from '../api/platform'
import { countPetitionValues, filterPetitionItems } from '../features/petition-litigation/model'
import type { PetitionLitigationItem, PetitionRiskLevel, SupervisionCategory } from '../types/platform'

const route = useRoute()
const router = useRouter()
const section = computed(() => String(route.params.section || 'overview'))
const sectionMeta = {
  overview: ['整体情况', '汇聚12345、综治中心等来源，展示街道分布、风险结构与全量事项。'],
  clues: ['监督线索', '将外部治理事项按检察监督相关性辅助分类，最终由人工复核。'],
  'reverse-review': ['反向审视', '从群众反映中反向发现可能指向检察案件、办案环节或内部部门的问题。']
} as const
const sectionTitle = computed(() => sectionMeta[section.value as keyof typeof sectionMeta]?.[0] || '涉访涉诉')
const sectionDescription = computed(() => sectionMeta[section.value as keyof typeof sectionMeta]?.[1] || '')

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

const filteredItems = computed(() => filterPetitionItems(items.value, { ...filters, dateRange: dateRange.value }))
const streetOptions = computed(() => [...new Set(items.value.map((item) => item.street).filter(Boolean))] as string[])
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
const mapPoints = computed(() => streetOptions.value.map((street) => ({ community: street, annualCases: filteredItems.value.filter((item) => item.street === street).length })))
const metrics = computed(() => [
  { label: '事项总量', value: filteredItems.value.length, hint: '当前筛选口径', tone: 'cyan' },
  { label: '红色风险事项', value: filteredItems.value.filter((item) => item.riskLevel === '红色').length, hint: '点击只看红色', tone: 'red', action: () => { filters.riskLevel = '红色' as PetitionRiskLevel } },
  { label: '橙色+红色', value: filteredItems.value.filter((item) => ['橙色', '红色'].includes(item.riskLevel || '')).length, hint: '高风险事项', tone: 'orange' },
  { label: '重点信访', value: filteredItems.value.filter((item) => item.eventCategory === '重点信访事项').length, hint: '重复、越级等事项', tone: 'yellow' },
  { label: '监督线索', value: filteredItems.value.filter((item) => item.supervisionCategories?.length).length, hint: '辅助识别并待复核', tone: 'blue' },
  { label: '政治安全关联', value: supervisionCount('政治安全'), hint: '可转专题继续研判', tone: 'purple' }
])

const riskColor = (name: string) => ({ '蓝色': '#2f8dff', '黄色': '#f2c94c', '橙色': '#ff922b', '红色': '#ff5252' }[name] || '#5ed9ff')
const selectRisk = (name: string) => { filters.riskLevel = name as PetitionRiskLevel }
const clearFilters = () => { filters.street = ''; filters.source = ''; filters.riskLevel = ''; filters.eventCategory = ''; filters.keyword = ''; dateRange.value = [] }
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
const ItemTable = defineComponent({
  props: { items: { type: Array as () => PetitionLitigationItem[], required: true }, reverse: Boolean }, emits: ['open'],
  setup(props, { emit }) {
    const columns = computed(() => props.reverse ? [
      { title: '来源事项', dataIndex: 'conflictNo', width: 150 }, { title: '发生时间', dataIndex: 'occurredAt', width: 160 }, { title: '关联部门', dataIndex: 'reverseReview.departmentName', width: 150 },
      { title: '问题摘要', dataIndex: 'reverseReview.issueSummary', ellipsis: true, tooltip: true }, { title: '状态', dataIndex: 'reverseReview.status', width: 100 }, { title: '操作', slotName: 'action', width: 90 }
    ] : [
      { title: '发生时间', dataIndex: 'occurredAt', width: 160 }, { title: '事件来源', dataIndex: 'source', width: 120 }, { title: '风险等级', dataIndex: 'riskLevel', slotName: 'riskLevel', width: 105 },
      { title: '所属街道', dataIndex: 'street', width: 145 }, { title: '事件类别', dataIndex: 'eventCategory', width: 135 }, { title: '事件简述', dataIndex: 'summary', ellipsis: true, tooltip: true }, { title: '操作', slotName: 'action', width: 90 }
    ])
    return () => h('section', { class: 'tech-panel table-panel' }, [h('div', { class: 'panel-title' }, [h('span', props.reverse ? '反向审视事项' : '全量事项列表'), h('small', `共 ${props.items.length} 条`)]), h(resolveComponent('a-table') as any, { columns: columns.value, data: props.items, pagination: { pageSize: 8 }, rowKey: 'id', scroll: { x: 1000, y: focusedPanel.value.includes('items') ? 420 : 165 } }, { riskLevel: ({ record }: any) => h(resolveComponent('a-tag') as any, { color: record.riskLevel === '红色' ? 'red' : record.riskLevel === '橙色' ? 'orangered' : record.riskLevel === '黄色' ? 'gold' : 'arcoblue' }, () => record.riskLevel), action: ({ record }: any) => h(resolveComponent('a-button') as any, { type: 'text', size: 'small', onClick: () => emit('open', record) }, () => '查看详情') })])
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

.petition-workspace .workspace-heading {
  min-height: 58px;
  flex: 0 0 58px;
  align-items: center;
  margin: 0;
  padding: 8px 14px;
}
.petition-workspace .workspace-heading p { font-size: 10px; }
.petition-workspace .workspace-heading h1 { display: inline; margin: 0 10px 0 0; font-size: 21px; }
.petition-workspace .workspace-heading span { font-size: 12px; }
.petition-workspace .workspace-heading :deep(.arco-tag) {
  color: #9feaff !important;
  border-color: rgba(78, 215, 255, .36) !important;
  background: rgba(10, 69, 106, .72) !important;
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
  min-height: 78px;
  flex: 0 0 78px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 8px;
}
.petition-workspace .metric-card { min-height: 0; padding: 7px 10px; }
.petition-workspace .metric-card strong { margin: 1px 0; font-size: 23px; }

.petition-dashboard-grid {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(260px, .78fr) minmax(520px, 1.35fr) minmax(260px, .78fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 8px;
  overflow: hidden;
}
.petition-dashboard-grid > :first-child { grid-column: 2; grid-row: 1; }
.petition-dashboard-grid > :nth-child(2) { grid-column: 1; grid-row: 1; }
.petition-dashboard-grid > :nth-child(3) { grid-column: 3; grid-row: 1; }
.petition-dashboard-grid .structure-column { height: 100%; gap: 5px; padding: 6px; overflow: auto; }
.petition-dashboard-grid .compact-panel { padding: 7px; }
.petition-dashboard-grid .compact-panel .panel-title { padding: 4px 6px; }
.petition-dashboard-grid .distribution-row,
.petition-dashboard-grid .bar-row { padding: 4px 2px; }
.petition-dashboard-grid .category-tags { gap: 4px; padding-top: 4px; }
.petition-dashboard-grid .category-tags button { padding: 4px 6px; }
.petition-dashboard-grid .table-panel { height: 100%; margin: 0; border: 0; }
.petition-dashboard-grid .table-panel > .panel-title { display: none; }

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
</style>
