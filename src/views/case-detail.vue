<template>
  <div class="case-detail-page" :class="{ 'theme-light': themeMode === 'light' }">
    <div class="nav-container">
      <BackHome />
      <span class="nav-back-btn" @click="router.push('/risk-analysis')">← 返回风险分析管理</span>
    </div>
    <a-page-header :title="caseData?.caseName || '案件详情'" subtitle="Case Detail" @back="router.back()" />

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