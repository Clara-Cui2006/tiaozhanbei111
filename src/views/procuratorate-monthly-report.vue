<template>
  <div class="monthly-shell">
    <BackHome />
    <section class="workspace">
      <header class="workspace-head">
        <div class="brandline">
          <span class="brand-shield"><IconSafe /></span>
          <div><strong>检智西城 · 检察业务月报生成</strong><small>数据归集 · 风险识别 · 自动成稿 · 人工审核</small></div>
        </div>
        <div class="head-actions">
          <a-month-picker v-model="selectedMonth" value-format="YYYY-MM" :allow-clear="false" @change="loadReport" />
          <a-button :loading="generating" @click="regenerate"><IconRefresh /> 重新生成</a-button>
          <a-button @click="toggleEdit"><IconEdit /> {{ editing ? '退出编辑' : '在线编辑' }}</a-button>
          <a-button @click="exportWord"><IconFile /> 导出Word</a-button>
          <a-button v-if="report?.status === '待审核' && hasPermission('material:publish')" class="review-button" type="primary" @click="confirmPublish"><IconSend /> 确认发布</a-button>
          <a-button v-if="report?.status === '待审核' && hasPermission('material:publish')" status="warning" @click="rejectReport">审核退回</a-button>
          <a-button v-if="report?.status === '审核退回'" class="review-button" type="primary" @click="submitReview"><IconSend /> 提交审核</a-button>
        </div>
      </header>

      <div v-if="report" class="workspace-body">
        <aside class="section-nav">
          <div class="nav-caption">材料导航</div>
          <button v-for="item in MONTHLY_REPORT_SECTIONS" :key="item.key" :class="{ active: activeSection === item.key }" @click="goSection(item.key)">
            <component :is="sectionIcons[item.key]" /> <span>{{ item.label }}</span>
          </button>
          <div class="status-panel">
            <span>当前状态</span>
            <a-tag :color="statusColor">{{ report.status }}</a-tag>
            <small>更新于 {{ report.updatedAt }}</small>
          </div>
        </aside>

        <main class="paper-wrap">
          <article class="report-paper">
            <div class="paper-stamp">内部材料 · 人工审核</div>
            <template v-if="editing">
              <a-input v-model="draft.title" class="title-input" />
              <div class="report-period">（{{ monthText }}）</div>
              <a-textarea v-model="draft.summary" :auto-size="{ minRows: 2, maxRows: 4 }" class="summary-input" />
            </template>
            <template v-else>
              <h1>{{ report.title }}</h1>
              <div class="report-period">（{{ monthText }}）</div>
              <p class="summary"><strong>摘要：</strong>{{ report.summary }}</p>
            </template>

            <div class="report-grid">
              <section :id="'section-recentChanges'" class="report-card recent-card">
                <h2><IconArrowRise /> 一、近期变化</h2>
                <SectionEditor v-if="editing" v-model="draft.sections.recentChanges" />
                <template v-else><ul><li v-for="line in report.sections.recentChanges" :key="line">{{ line }}</li></ul></template>
                <div class="sparkline" aria-label="月内风险变化折线图">
                  <svg viewBox="0 0 240 72" role="img"><polyline :points="trendPoints" fill="none" stroke="#1769d2" stroke-width="3" /><circle v-for="point in trendDots" :key="point.x" :cx="point.x" :cy="point.y" r="3" fill="#1769d2" /></svg>
                </div>
              </section>

              <section :id="'section-highFrequencyIssues'" class="report-card">
                <h2><IconExclamationCircle /> 二、高发问题 <span class="top-badge">TOP5</span></h2>
                <SectionEditor v-if="editing" v-model="draft.sections.highFrequencyIssues" />
                <div v-else class="rank-list"><div v-for="(item, index) in report.metrics.issues" :key="item.name"><b>{{ index + 1 }}</b><span>{{ item.name }}</span><i><em :style="{ width: item.percentage * 2.2 + '%' }"></em></i><small>{{ item.value }}件　{{ item.percentage }}%</small></div></div>
              </section>

              <section :id="'section-keyStreets'" class="report-card">
                <h2><IconLocation /> 三、重点街道</h2>
                <SectionEditor v-if="editing" v-model="draft.sections.keyStreets" />
                <table v-else><thead><tr><th>街道</th><th>风险事件</th><th>占比</th><th>环比变化</th></tr></thead><tbody><tr v-for="item in report.metrics.streets" :key="item.name"><td>{{ item.name }}</td><td>{{ item.value }}</td><td>{{ item.percentage }}%</td><td :class="item.change && item.change > 0 ? 'rise' : 'fall'">{{ item.change && item.change > 0 ? '↑' : '↓' }} {{ Math.abs(item.change || 0) }}%</td></tr></tbody></table>
              </section>

              <section :id="'section-keyGroups'" class="report-card group-card">
                <h2><IconUserGroup /> 四、重点人群</h2>
                <SectionEditor v-if="editing" v-model="draft.sections.keyGroups" />
                <div v-else class="donut-layout"><div class="donut" :style="donutStyle"></div><ul><li v-for="(item,index) in report.metrics.groups" :key="item.name"><i :style="{ background: groupColors[index] }"></i>{{ item.name }} <b>{{ item.percentage }}%</b></li></ul></div>
              </section>

              <section :id="'section-keyIndustries'" class="report-card industry-card">
                <h2><IconApps /> 五、重点行业</h2>
                <SectionEditor v-if="editing" v-model="draft.sections.keyIndustries" />
                <div v-else class="industry-list"><div v-for="(item,index) in report.metrics.industries" :key="item.name"><span class="industry-icon"><component :is="industryIcons[index % industryIcons.length]" /></span><b>{{ item.name }}</b><strong>{{ item.percentage }}%</strong></div></div>
              </section>

              <section :id="'section-causeAnalysis'" class="report-card">
                <h2><IconMindMapping /> 六、原因分析</h2>
                <SectionEditor v-if="editing" v-model="draft.sections.causeAnalysis" />
                <ul v-else><li v-for="line in report.sections.causeAnalysis" :key="line">{{ line }}</li></ul>
              </section>

              <section :id="'section-recommendations'" class="report-card recommendations-card">
                <h2><IconBulb /> 七、履职建议</h2>
                <SectionEditor v-if="editing" v-model="draft.sections.recommendations" />
                <ol v-else><li v-for="line in report.sections.recommendations" :key="line">{{ line }}</li></ol>
              </section>
            </div>

            <footer>注：本月报由平台基于授权范围内数据和院内本地 AI API 辅助生成，内容仅供参考，最终以检察机关人工审核意见为准。</footer>
          </article>
          <div v-if="editing" class="edit-dock"><span>正在编辑月报草稿，所有章节均需保留有效内容</span><a-space><a-button @click="cancelEdit">取消</a-button><a-button type="primary" :loading="saving" @click="saveDraft">保存草稿</a-button></a-space></div>
        </main>
      </div>
      <a-result v-else-if="!loading" status="404" title="该月份尚未生成月报" subtitle="点击下方按钮，平台将汇总数据并调用院内本地 AI API 生成待审核草稿"><template #extra><a-button type="primary" :loading="generating" @click="regenerate">生成本月月报</a-button></template></a-result>
      <div v-else class="loading-state"><a-spin tip="正在读取月报..." /></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, reactive, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { IconApps, IconArrowRise, IconBulb, IconEdit, IconExclamationCircle, IconFile, IconLocation, IconMindMapping, IconRefresh, IconSafe, IconSend, IconUserGroup, IconHome, IconComputer, IconStorage } from '@arco-design/web-vue/es/icon'
import BackHome from '../components/back-home.vue'
import { MONTHLY_REPORT_SECTIONS, createMonthlyReportWordHtml, validateMonthlyReportSections, type MonthlyReportSectionKey } from '../features/monthly-report/model'
import { fetchProcuratorateMonthlyReport, generateProcuratorateMonthlyReport, saveProcuratorateMonthlyReport, transitionProcuratorateMonthlyReport } from '../api/platform'
import type { ProcuratorateMonthlyReport } from '../types/platform'
import { hasPermission } from '../services/auth'

const SectionEditor = defineComponent({
  props: { modelValue: { type: Array as () => string[], required: true } }, emits: ['update:modelValue'],
  setup(props, { emit }) { return () => h('div', { class: 'section-editor' }, props.modelValue.map((line, index) => h('div', { class: 'edit-line' }, [h('span', `${index + 1}.`), h('input', { value: line, onInput: (event: Event) => { const next = [...props.modelValue]; next[index] = (event.target as HTMLInputElement).value; emit('update:modelValue', next) } })]))) }
})

const now = new Date(); const selectedMonth = ref(`${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`)
const report = ref<ProcuratorateMonthlyReport | null>(null); const draft = reactive<any>({}); const loading = ref(false); const generating = ref(false); const saving = ref(false); const editing = ref(false); const activeSection = ref<MonthlyReportSectionKey>('recentChanges')
const sectionIcons: Record<MonthlyReportSectionKey, any> = { recentChanges: IconArrowRise, highFrequencyIssues: IconExclamationCircle, keyStreets: IconLocation, keyGroups: IconUserGroup, keyIndustries: IconApps, causeAnalysis: IconMindMapping, recommendations: IconBulb }
const industryIcons = [IconHome, IconBulb, IconComputer, IconStorage, IconApps]
const groupColors = ['#1465ca', '#4e93e6', '#8bb8ee', '#d2aa5a']
const monthText = computed(() => { const [year, month] = selectedMonth.value.split('-'); return `${year}年${Number(month)}月` })
const statusColor = computed(() => ({ '生成中': 'blue', '待审核': 'orange', '审核退回': 'red', '已发布': 'green' }[report.value?.status || '生成中']))
const trendDots = computed(() => (report.value?.metrics.trend || []).map((value, index, list) => ({ x: 8 + index * (224 / Math.max(list.length - 1, 1)), y: 64 - (value - Math.min(...list)) / Math.max(Math.max(...list) - Math.min(...list), 1) * 54 })))
const trendPoints = computed(() => trendDots.value.map((p) => `${p.x},${p.y}`).join(' '))
const donutStyle = computed(() => { let start = 0; const segments = (report.value?.metrics.groups || []).map((item,index) => { const end = start + item.percentage; const value = `${groupColors[index]} ${start}% ${end}%`; start = end; return value }); return { background: `conic-gradient(${segments.join(',')})` } })

const cloneReport = (value: ProcuratorateMonthlyReport) => JSON.parse(JSON.stringify(value)) as ProcuratorateMonthlyReport
const syncDraft = () => { if (report.value) Object.assign(draft, cloneReport(report.value)) }
async function loadReport() { loading.value = true; editing.value = false; try { report.value = await fetchProcuratorateMonthlyReport(selectedMonth.value); syncDraft() } catch { report.value = null } finally { loading.value = false } }
async function regenerate() { generating.value = true; try { report.value = await generateProcuratorateMonthlyReport(selectedMonth.value); syncDraft(); Message.success('月报草稿已生成，须经人工审核后方可发布') } catch { Message.error('月报生成失败，请检查院内模型服务或稍后重试') } finally { generating.value = false } }
function toggleEdit() { if (!report.value) return; if (editing.value) cancelEdit(); else { syncDraft(); editing.value = true } }
function cancelEdit() { syncDraft(); editing.value = false }
async function saveDraft() { const missing = validateMonthlyReportSections(draft.sections); if (missing.length) { Message.warning(`请补充：${missing.join('、')}`); return } saving.value = true; try { report.value = await saveProcuratorateMonthlyReport(draft); syncDraft(); editing.value = false; Message.success('月报草稿已保存') } finally { saving.value = false } }
async function submitReview() { if (!report.value) return; report.value = await transitionProcuratorateMonthlyReport(report.value.id, '待审核'); syncDraft(); Message.success('已提交人工审核') }
function confirmPublish() { if (!report.value) return; Modal.confirm({ title: '确认发布月报', content: '请确认全部数据、分析和履职建议均已由检察官人工核验。发布后不可直接修改。', okText: '已核验，确认发布', onOk: async () => { report.value = await transitionProcuratorateMonthlyReport(report.value!.id, '已发布'); syncDraft(); Message.success('月报已发布') } }) }
async function rejectReport() { if (!report.value) return; report.value = await transitionProcuratorateMonthlyReport(report.value.id, '审核退回'); syncDraft(); Message.info('月报已退回修改') }
function goSection(key: MonthlyReportSectionKey) { activeSection.value = key; document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
function exportWord() { if (!report.value) return; const html = createMonthlyReportWordHtml(report.value); const blob = new Blob(['\ufeff', html], { type: 'application/msword' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${report.value.title}-${selectedMonth.value}.doc`; link.click(); URL.revokeObjectURL(url); Message.success('月报 Word 文档已导出') }
loadReport()
</script>

<style scoped>
.monthly-shell{min-height:100%;padding:18px 22px 32px;background:radial-gradient(circle at 10% 25%,rgba(28,108,230,.2),transparent 28%),linear-gradient(135deg,#031638,#073775 52%,#052353);color:#092a5f;font-family:"Microsoft YaHei","Noto Serif SC",sans-serif}.workspace{max-width:1640px;margin:12px auto;background:#f8fbff;border:1px solid #65a9fa;border-radius:14px;box-shadow:0 0 0 6px rgba(54,148,255,.16),0 24px 70px rgba(0,6,31,.48);overflow:hidden}.workspace-head{min-height:76px;padding:12px 22px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid #d1ddec;background:linear-gradient(180deg,#fff,#f4f8fd)}.brandline{display:flex;align-items:center;gap:12px;white-space:nowrap}.brand-shield{font-size:29px;color:#1261c2}.brandline strong{display:block;font-family:"STKaiti","KaiTi",serif;font-size:22px;color:#0b2149;letter-spacing:1px}.brandline small{display:block;margin-top:3px;color:#6e8098}.head-actions{display:flex;align-items:center;justify-content:flex-end;gap:9px;flex-wrap:wrap}.head-actions :deep(.arco-btn){height:40px;border-color:#acc9ef;color:#0d55ad;font-weight:650}.review-button{background:linear-gradient(135deg,#1772e6,#0347a7)!important;color:white!important;box-shadow:0 6px 14px rgba(15,92,194,.26)}.workspace-body{display:grid;grid-template-columns:170px 1fr;min-height:760px}.section-nav{padding:18px 10px;background:linear-gradient(90deg,#f8fbff,#edf4fc);border-right:1px solid #d2deed}.nav-caption{text-align:center;color:#526987;font-size:14px;margin:8px 0 14px}.section-nav button{width:100%;height:51px;margin:3px 0;border:1px solid transparent;border-radius:7px;background:transparent;color:#174b91;font-weight:650;font-size:15px;text-align:left;padding:0 12px;display:flex;align-items:center;gap:10px;cursor:pointer}.section-nav button:hover,.section-nav button.active{background:#fff;border-color:#8fbdf4;box-shadow:0 3px 10px rgba(22,95,184,.12);color:#075ac4}.status-panel{margin:24px 5px 0;padding:14px 10px;border-top:1px solid #d8e3f0;display:grid;gap:9px;color:#6b7d94}.status-panel small{font-size:11px;line-height:1.5}.paper-wrap{padding:24px 28px 80px;overflow:auto;max-height:calc(100vh - 150px);background:linear-gradient(120deg,#edf4fb,#f9fbfe)}.report-paper{position:relative;max-width:1180px;min-height:700px;margin:auto;padding:30px 34px 22px;background:#fff;border:1px solid #cfdceb;border-radius:10px;box-shadow:0 10px 32px rgba(24,54,91,.13)}.paper-stamp{position:absolute;right:28px;top:20px;border:1px solid #d6a846;color:#9a6a07;padding:4px 9px;border-radius:4px;font-size:12px;letter-spacing:1px}.report-paper h1{text-align:center;font-family:"STSong","SimSun",serif;font-size:29px;margin:0 120px 4px;color:#111;letter-spacing:2px}.report-period{text-align:center;color:#283247;margin-bottom:14px;font-size:17px}.summary{padding:11px 5px 17px;margin:0;color:#29384d;border-bottom:1px dashed #d6dee9;line-height:1.8}.report-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}.report-card{border:1px solid #c8dbf2;border-radius:8px;min-height:165px;overflow:hidden;background:#fff;scroll-margin:120px}.report-card h2{height:42px;margin:0;padding:0 14px;display:flex;align-items:center;gap:8px;background:linear-gradient(90deg,#f0f6fd,#fff);border-bottom:1px solid #d8e4f3;font-size:17px;color:#0754ad}.report-card ul,.report-card ol{margin:12px 20px;padding-left:18px;color:#28384e;line-height:1.85;font-size:14px}.recent-card{position:relative}.recent-card ul{max-width:58%}.sparkline{position:absolute;right:14px;bottom:14px;width:38%;height:72px}.sparkline svg{width:100%;height:100%;border-left:1px solid #d7e0eb;border-bottom:1px solid #d7e0eb}.top-badge{margin-left:auto;font-size:11px;border:1px solid #99c1f0;border-radius:4px;padding:2px 5px}.rank-list{padding:8px 14px}.rank-list>div{height:25px;display:grid;grid-template-columns:20px 1.25fr 1fr 98px;align-items:center;gap:7px;font-size:12px}.rank-list b{color:#d23e36}.rank-list i{height:6px;border-radius:8px;background:#e7edf5;overflow:hidden}.rank-list em{display:block;height:100%;background:linear-gradient(90deg,#135ec4,#458ce6);border-radius:8px}.rank-list small{text-align:right}.report-card table{width:calc(100% - 20px);margin:9px 10px;border-collapse:collapse;font-size:12px}.report-card th,.report-card td{padding:7px;border:1px solid #d9e2ed;text-align:center}.report-card th{background:#edf3f9}.rise{color:#d23c33;font-weight:bold}.fall{color:#11976d;font-weight:bold}.donut-layout{display:flex;align-items:center;justify-content:center;gap:35px;padding:12px}.donut{width:112px;height:112px;border-radius:50%;position:relative}.donut:after{content:"";position:absolute;inset:27px;background:white;border-radius:50%}.donut-layout ul{list-style:none;margin:0;padding:0}.donut-layout li{line-height:1.8;white-space:nowrap}.donut-layout li i{display:inline-block;width:9px;height:9px;margin-right:8px}.donut-layout li b{float:right;margin-left:20px}.industry-list{height:118px;display:flex;align-items:center;justify-content:space-evenly;text-align:center}.industry-list>div{display:grid;gap:5px;color:#34465e}.industry-icon{font-size:24px;color:#1166cc}.industry-list b{font-size:12px}.industry-list strong{font-size:15px}.recommendations-card{grid-column:1/-1;min-height:130px}.recommendations-card ol{columns:2;column-gap:40px}.report-paper footer{margin-top:16px;color:#77869a;font-size:12px}.title-input{display:block;width:62%;margin:0 auto 8px}.summary-input{margin-bottom:17px}.section-editor{padding:10px 14px}.edit-line{display:grid;grid-template-columns:22px 1fr;align-items:center;margin:6px 0;color:#48617f}.edit-line input{height:30px;border:1px solid #bdd0e7;border-radius:4px;padding:0 8px;color:#253b56}.edit-dock{position:sticky;bottom:8px;max-width:1040px;margin:16px auto 0;padding:12px 18px;border-radius:8px;background:rgba(6,31,69,.94);color:#e9f3ff;display:flex;align-items:center;justify-content:space-between;box-shadow:0 8px 28px rgba(0,0,0,.25)}.loading-state{height:620px;display:grid;place-items:center}
@media(max-width:1100px){.workspace-head{align-items:flex-start;flex-direction:column}.head-actions{justify-content:flex-start}.workspace-body{grid-template-columns:1fr}.section-nav{display:flex;overflow-x:auto;border-right:0;border-bottom:1px solid #d2deed;padding:8px}.section-nav .nav-caption,.status-panel{display:none}.section-nav button{min-width:130px}.paper-wrap{max-height:none;padding:18px}.report-grid{grid-template-columns:1fr}.recommendations-card{grid-column:auto}.report-paper{padding:26px 20px}.report-paper h1{margin:30px 0 4px}.recommendations-card ol{columns:1}}
</style>
