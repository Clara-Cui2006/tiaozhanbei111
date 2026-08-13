<template>
  <div class="case-detail-page" :class="{ 'theme-light': themeMode === 'light' }">
    <div class="nav-container">
      <BackHome />
      <span class="nav-back-btn" @click="router.push('/risk-analysis')">← 返回风险分析管理</span>
    </div>
    <a-page-header :title="caseData?.caseName || '案件详情'" subtitle="Case Detail" @back="router.back()" />

    <div v-if="caseData" class="case-hero">
      <div><span class="hero-kicker">单案画像 · 人工复核辅助</span><h2>{{ caseData.caseName }}</h2><p>{{ caseData.caseNumber }} · {{ caseData.street || '街道待确认' }}</p></div>
      <div class="risk-orbit" :class="`risk-${caseData.riskLevel || '中'}`"><strong>{{ caseData.confidence || 68 }}%</strong><span>AI 辅助置信度</span></div>
    </div>

    <div v-if="caseData" class="portrait-grid">
      <a-card title="案件基础信息" :bordered="false" class="portrait-card case-profile">
        <div class="metric-row"><span>预警等级</span><b>{{ caseData.riskLevel || '中' }}风险</b></div><div class="metric-row"><span>预警状态</span><b>{{ caseData.alertStatus || '待人工复核' }}</b></div><div class="metric-row"><span>案件类型</span><b>{{ caseData.category }}</b></div>
      </a-card>
      <a-card title="人物画像" :bordered="false" class="portrait-card subject-profile">
        <div class="subject-avatar">人</div><div class="subject-facts"><b>{{ caseData.subject?.name || '当事人信息已脱敏' }}</b><span>{{ caseData.subject?.age || '--' }} 岁 · {{ caseData.subject?.occupation || '职业待核' }}</span><em>{{ caseData.subject?.specialIdentity || '无特殊身份' }}</em></div>
      </a-card>
      <a-card title="重点标签" :bordered="false" class="portrait-card tag-profile"><span v-for="tag in caseData.tags || []" :key="tag">{{ tag }}</span></a-card>
    </div>

    <a-card :bordered="false" style="margin-top: 16px" :loading="loading">
      <template v-if="caseData">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="案件名称">{{ caseData.caseName }}</a-descriptions-item>
          <a-descriptions-item label="案号">{{ caseData.caseNumber }}</a-descriptions-item>
          <a-descriptions-item label="案件类别">{{ caseData.category }}</a-descriptions-item>
          <a-descriptions-item label="审判程序">{{ caseData.procedureType }}</a-descriptions-item>
          <a-descriptions-item label="关键词" :span="2">
            <a-space>
              <a-tag v-for="kw in caseData.keywords.split(',')" :key="kw" color="arcoblue">
                {{ kw }}
              </a-tag>
            </a-space>
          </a-descriptions-item>
          <a-descriptions-item label="裁判理由 / 案情简述" :span="2">
            <div class="judgment-text">{{ caseData.judgmentReason }}</div>
          </a-descriptions-item>
        </a-descriptions>
      </template>
      <template v-else>
        <a-empty description="未找到该案件信息" />
      </template>
    </a-card>

    <div v-if="caseData" class="analysis-grid">
      <a-card title="固定规则命中" :bordered="false" class="evidence-card"><div v-if="caseData.ruleHits?.length"><p v-for="item in caseData.ruleHits" :key="item"><i></i>{{ item }}</p></div><a-empty v-else description="未命中强制规则" /></a-card>
      <a-card title="AI 文本研判提示" :bordered="false" class="evidence-card ai-evidence"><p v-for="item in caseData.aiHints || []" :key="item"><i></i>{{ item }}</p><small>本区域仅展示可解释的风险特征，不展示涉密证据原文。</small></a-card>
    </div>

    <a-card :bordered="false" style="margin-top: 16px" class="ai-card">
      <template #title>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>🤖 AI 案情分析与处置建议</span>
          <a-button type="primary" size="small" :loading="aiLoading" @click="generateAnalysis">
            {{ aiAnalysis ? '重新分析' : '智能分析' }}
          </a-button>
        </div>
      </template>
      <div v-if="aiLoading" class="ai-placeholder">
        AI 正在分析案情，请稍候...
      </div>
      <template v-else-if="aiAnalysis">
        <div class="ai-content" v-html="formatAiContent(aiAnalysis)"></div>
        <div class="ai-tip-bar">AI生成仅供参考，用户需自行仔细审核</div>
      </template>
      <div v-else class="ai-placeholder">
        点击「智能分析」按钮，AI 将基于案件信息生成案情分析与处置建议
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BackHome from '../components/back-home.vue'
import { fetchCaseDetailById } from '../api/platform'
import { chatWithLLM } from '../services/llm'
import { USER_PROMPT_TEMPLATES } from '../services/prompts'
import type { CaseDetail } from '../types/platform'

const route = useRoute()
const router = useRouter()
const caseData = ref<CaseDetail | null>(null)
const loading = ref(true)
const aiLoading = ref(false)
const aiAnalysis = ref('')

// ---------- 主题检测（仿照之前项目的 isLightTheme 函数） ----------
const isLightTheme = () => localStorage.getItem('platform:theme-mode') === 'light'
const themeMode = ref<'light' | 'dark'>(isLightTheme() ? 'light' : 'dark')

const updateTheme = () => {
  themeMode.value = isLightTheme() ? 'light' : 'dark'
}

let themeObserver: MutationObserver | null = null

// 监听 localStorage 变化（如果主题切换时触发 storage 事件）
const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'platform:theme-mode') {
    updateTheme()
  }
}

// 监听 body class 变化（某些主题切换方式会修改 body 类）
const setupThemeObserver = () => {
  themeObserver = new MutationObserver(() => {
    updateTheme()
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
}

// ---------- AI 分析 ----------
const generateAnalysis = async () => {
  if (!caseData.value) return
  aiLoading.value = true
  try {
    const c = caseData.value
    const prompt = USER_PROMPT_TEMPLATES.caseDetail({
      caseName: c.caseName,
      caseNumber: c.caseNumber,
      category: c.category,
      procedureType: c.procedureType,
      keywords: c.keywords,
      judgmentReason: c.judgmentReason
    })

    aiAnalysis.value = await chatWithLLM(prompt, 'caseDetail')
  } catch (e) {
    aiAnalysis.value = '分析失败，请稍后重试。'
  } finally {
    aiLoading.value = false
  }
}

const formatAiContent = (content: string) => {
  return content
    .replace(/【(.+?)】/g, '<strong class="ai-section-title">$1</strong>')
    .replace(/\n/g, '<br>')
}

// ---------- 加载数据 ----------
onMounted(async () => {
  const id = Number(route.params.id)
  if (id) {
    try {
      caseData.value = await fetchCaseDetailById(id)
    } catch (e) {
      console.error(e)
    }
  }
  loading.value = false

  // 初始化主题监听
  updateTheme()
  window.addEventListener('storage', handleStorageChange)
  setupThemeObserver()
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
  themeObserver?.disconnect()
})
</script>

<style scoped>
/* ===== 导航栏返回按钮区域 ===== */
.nav-container {
  display: flex;
  align-items: center;
  gap: 20px;
}
.case-hero{display:flex;align-items:center;justify-content:space-between;margin-top:16px;padding:24px 28px;border:1px solid rgba(74,185,240,.3);border-radius:14px;background:radial-gradient(circle at 85% 20%,rgba(31,159,207,.2),transparent 32%),linear-gradient(135deg,rgba(8,42,73,.96),rgba(4,21,39,.96));box-shadow:0 20px 45px rgba(0,0,0,.2)}.hero-kicker{color:#5ed8ff;font-size:11px;letter-spacing:.18em}.case-hero h2{margin:7px 0 4px;color:#f3fbff;font:700 28px Georgia,"Songti SC",serif}.case-hero p{margin:0;color:#82adc3}.risk-orbit{width:112px;height:112px;display:grid;place-content:center;text-align:center;border:1px solid currentColor;border-radius:50%;box-shadow:inset 0 0 22px currentColor,0 0 26px rgba(66,207,255,.16)}.risk-orbit strong{font-size:27px}.risk-orbit span{font-size:9px}.risk-高{color:#ff746e}.risk-中{color:#efc464}.risk-低{color:#54dca8}.portrait-grid{display:grid;grid-template-columns:1fr 1fr 1.3fr;gap:12px;margin-top:14px}.portrait-card{min-height:152px}.metric-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(105,181,218,.12);color:#79a8bf}.metric-row b{color:#eaf8ff}.subject-profile :deep(.arco-card-body){display:flex;align-items:center;gap:14px}.subject-avatar{width:58px;height:58px;display:grid;place-items:center;border:1px solid #5bd8ff;border-radius:50%;color:#6ce3ff;font-size:23px;background:rgba(23,137,180,.14)}.subject-facts b,.subject-facts span,.subject-facts em{display:block}.subject-facts b{color:#eefaff;font-size:17px}.subject-facts span{margin:6px 0;color:#8fb7ca}.subject-facts em{color:#f2c86f;font-size:11px;font-style:normal}.tag-profile span{display:inline-block;margin:4px;padding:5px 8px;border:1px solid rgba(71,194,239,.3);border-radius:4px;color:#68dcff;background:rgba(20,111,148,.12);font-size:11px}.analysis-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.evidence-card p{margin:7px 0;color:#bfe1f0}.evidence-card p i{display:inline-block;width:6px;height:6px;margin-right:9px;border-radius:50%;background:#f2c86f;box-shadow:0 0 9px #f2c86f}.ai-evidence p i{background:#55dcff;box-shadow:0 0 9px #55dcff}.ai-evidence small{display:block;margin-top:14px;padding-top:10px;border-top:1px solid rgba(82,173,216,.15);color:#6f99ad}@media(max-width:800px){.portrait-grid,.analysis-grid{grid-template-columns:1fr}.case-hero{align-items:flex-start}.risk-orbit{width:84px;height:84px}}

.nav-back-btn {
  cursor: pointer;
  font-size: 14px;
  color: #bde7ff;
  transition: color 0.3s;
}

.nav-back-btn:hover {
  color: #eff9ff;
}

/* ===== 基础深色样式（默认） ===== */
.case-detail-page :deep(.arco-page-header-title) {
  color: #eff9ff;
  font-size: 22px;
  font-weight: 600;
}
.case-detail-page :deep(.arco-page-header-sub-title) {
  color: #bde7ff;
  font-size: 14px;
}
.case-detail-page :deep(.arco-card) {
  background: rgba(14, 39, 78, 0.78);
  border-color: rgba(110, 196, 255, 0.2);
}

/* 描述列表 - 标签单元格 */
.case-detail-page :deep(.arco-descriptions-item-label-block) {
  background-color: rgba(13, 35, 66, 0.95) !important;
  color: #9fd4f2 !important;
  font-size: 15px;
  font-weight: 500;
  border-color: rgba(110, 196, 255, 0.2) !important;
}

/* 描述列表 - 内容单元格 */
.case-detail-page :deep(.arco-descriptions-item-value-block) {
  background-color: rgba(8, 23, 44, 0.92) !important;
  color: #ddf4ff !important;
  font-size: 16px;
  border-color: rgba(110, 196, 255, 0.2) !important;
}

/* 裁判理由文本 */
.judgment-text {
  line-height: 1.8;
  color: #d7f2ff;
  font-size: 15px;
}

/* 关键词标签 */
.case-detail-page :deep(.arco-tag) {
  font-size: 14px;
}

/* AI 卡片 */
.ai-card :deep(.arco-card-header) {
  border-bottom-color: rgba(91, 191, 255, 0.2);
}
.ai-card :deep(.arco-card-header-title) {
  color: #eff9ff;
  font-size: 18px;
  font-weight: 600;
}

.ai-placeholder {
  text-align: center;
  padding: 40px;
  color: #8ec7e8;
  font-size: 15px;
}

.ai-content {
  line-height: 1.8;
  color: #d7f2ff;
  font-size: 15px;
  padding: 8px 0;
}

.ai-section-title {
  color: #5ad6ff;
  display: block;
  margin-top: 16px;
  margin-bottom: 4px;
  font-size: 16px;
  font-weight: 700;
}

.ai-tip-bar {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 199, 122, 0.35);
  background: rgba(255, 199, 122, 0.12);
  color: #ffd89a;
  font-size: 13px;
  line-height: 1.5;
}

/* ===== 浅色主题覆盖（通过 body.theme-light 或组件级类 .theme-light） ===== */
:global(body.theme-light) .case-detail-page .nav-back-btn,
.case-detail-page.theme-light .nav-back-btn {
  color: #1f5a85 !important;
}

:global(body.theme-light) .case-detail-page .nav-back-btn:hover,
.case-detail-page.theme-light .nav-back-btn:hover {
  color: #0a2f4d !important;
}

:global(body.theme-light) .case-detail-page :deep(.arco-page-header-title),
.case-detail-page.theme-light :deep(.arco-page-header-title) {
  color: #0a2f4d !important;
  font-size: 22px;
}
:global(body.theme-light) .case-detail-page :deep(.arco-page-header-sub-title),
.case-detail-page.theme-light :deep(.arco-page-header-sub-title) {
  color: #1f5a85 !important;
}
:global(body.theme-light) .case-detail-page :deep(.arco-card),
.case-detail-page.theme-light :deep(.arco-card) {
  background: rgba(235, 246, 255, 0.92) !important;
  border-color: rgba(74, 140, 198, 0.28) !important;
}

/* 描述列表浅色 */
:global(body.theme-light) .case-detail-page :deep(.arco-descriptions-item-label-block),
.case-detail-page.theme-light :deep(.arco-descriptions-item-label-block) {
  background-color: #eef5fc !important;
  color: #0a2f4d !important;
  font-weight: 600;
  border-color: rgba(74, 140, 198, 0.25) !important;
}
:global(body.theme-light) .case-detail-page :deep(.arco-descriptions-item-value-block),
.case-detail-page.theme-light :deep(.arco-descriptions-item-value-block) {
  background-color: #ffffff !important;
  color: #103a60 !important;
  border-color: rgba(74, 140, 198, 0.25) !important;
}

:global(body.theme-light) .case-detail-page .judgment-text,
.case-detail-page.theme-light .judgment-text {
  color: #103a60 !important;
}

/* AI 卡片浅色 */
:global(body.theme-light) .case-detail-page .ai-card :deep(.arco-card-header-title),
.case-detail-page.theme-light .ai-card :deep(.arco-card-header-title) {
  color: #0a2f4d !important;
}
:global(body.theme-light) .case-detail-page .ai-placeholder,
.case-detail-page.theme-light .ai-placeholder {
  color: #1f5a85 !important;
}
:global(body.theme-light) .case-detail-page .ai-content,
.case-detail-page.theme-light .ai-content {
  color: #103a60 !important;
}
:global(body.theme-light) .case-detail-page .ai-section-title,
.case-detail-page.theme-light .ai-section-title {
  color: #1d6eb5 !important;
}
:global(body.theme-light) .case-detail-page .ai-tip-bar,
.case-detail-page.theme-light .ai-tip-bar {
  background: rgba(255, 215, 120, 0.15);
  border-color: rgba(200, 150, 50, 0.35);
  color: #7a5a20;
}

/* 按钮等其他元素 */
:global(body.theme-light) .case-detail-page :deep(.arco-btn-primary),
.case-detail-page.theme-light :deep(.arco-btn-primary) {
  background-color: #1e6eb5 !important;
  border-color: #1e6eb5 !important;
}
</style>
