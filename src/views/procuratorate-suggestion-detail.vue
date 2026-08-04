<template>
  <div class="page-contrast" :class="{ 'theme-light': themeMode === 'light' }">
    <div class="nav-header">
      <BackHome />
      <a-button type="text" class="back-link" @click="goList">
        <template #icon><icon-left /></template>
        返回检察建议列表
      </a-button>
    </div>

    <a-page-header :title="record?.title || '检察建议详情'" subtitle="Procuratorate Suggestion Detail" class="custom-header" />

    <a-spin :loading="loading" style="width: 100%">
      <a-card v-if="record" :bordered="false" class="detail-card">
        <a-descriptions 
          :column="1" 
          bordered 
          size="large" 
          table-layout="fixed"
          :label-style="{ width: '150px' }" 
          class="tech-descriptions"
        >
          <a-descriptions-item label="建议类型">{{ record.type }}</a-descriptions-item>
          <a-descriptions-item label="建议对象">{{ record.target }}</a-descriptions-item>
          <a-descriptions-item label="发布日期">
            <span class="highlight-date">{{ record.issueDate }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="状 态">
            <a-tag :color="record.status === '处理中' ? 'arcoblue' : 'green'" class="tech-tag">
              {{ record.status }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="建议正文">
            <div 
              v-if="record.content" 
              class="body-text markdown-body" 
              v-html="renderedContent"
            ></div>
            <div v-else class="body-text">暂无内容</div>
          </a-descriptions-item>
        </a-descriptions>

        <div class="action-footer">
          <a-button type="primary" class="tech-btn-primary" @click="goEdit">编辑</a-button>
          <a-button class="tech-btn-secondary" @click="goList">关闭</a-button>
        </div>
      </a-card>
      <a-empty v-else-if="!loading" description="未找到该建议" />
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconLeft } from '@arco-design/web-vue/es/icon'
import { useRoute, useRouter } from 'vue-router'
import BackHome from '../components/back-home.vue'
import { fetchProcuratorateSuggestionById } from '../api/platform'
import type { ProcuratorateSuggestion } from '../types/platform'
import { marked } from 'marked'
import 'github-markdown-css/github-markdown.css'

const route = useRoute()
const router = useRouter()
const record = ref<ProcuratorateSuggestion | null>(null)
const loading = ref(true)

const renderedContent = computed(() => {
  if (!record.value?.content) return ''
  return marked.parse(record.value.content)
})

// ---------- 主题检测（与之前项目风格一致） ----------
const isLightTheme = () => localStorage.getItem('platform:theme-mode') === 'light'
const themeMode = ref<'light' | 'dark'>(isLightTheme() ? 'light' : 'dark')

const updateTheme = () => {
  themeMode.value = isLightTheme() ? 'light' : 'dark'
}

let themeObserver: MutationObserver | null = null

const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'platform:theme-mode') {
    updateTheme()
  }
}

const setupThemeObserver = () => {
  themeObserver = new MutationObserver(() => {
    updateTheme()
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
}

const goList = () => {
  router.push('/procuratorate-suggestion')
}

const goEdit = () => {
  const id = Number(route.params.id)
  if (!id) return
  router.push(`/procuratorate-suggestion/edit/${id}`)
}

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    record.value = await fetchProcuratorateSuggestionById(id)
  } catch {
    Message.error('建议不存在或已被忽略')
    record.value = null
  } finally {
    loading.value = false
  }

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
/* ===== 基础深色样式（默认） ===== */
.page-contrast {
  padding: 16px 24px;
}

.nav-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.back-link {
  color: #00e5ff;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.3s ease;
}
.back-link:hover {
  background: transparent;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.8);
}

.custom-header :deep(.arco-page-header-title) {
  color: #fff;
  font-size: 22px;
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.4);
}
.custom-header :deep(.arco-page-header-sub-title) {
  color: #00e5ff;
  font-size: 14px;
}

.detail-card {
  margin-top: 16px;
  border: 1px solid rgba(0, 229, 255, 0.2);
  background: rgba(8, 18, 38, 0.7) !important;
  backdrop-filter: blur(12px);
  border-radius: 12px;
}

.tech-descriptions {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(0, 229, 255, 0.3) !important;
}

.tech-descriptions :deep(.arco-descriptions-item-label),
.tech-descriptions :deep(.arco-descriptions-item-value) {
  border-bottom: 1px solid rgba(0, 229, 255, 0.35) !important; 
}
.tech-descriptions :deep(tr:last-child .arco-descriptions-item-label),
.tech-descriptions :deep(tr:last-child .arco-descriptions-item-value) {
  border-bottom: none !important;
}

.tech-descriptions :deep(.arco-descriptions-item-label) {
  background: rgba(10, 25, 45, 0.9) !important;
  color: #00e5ff !important;
  font-weight: 600;
  font-size: 16px;
  text-align: center !important;
  vertical-align: middle !important;
}

.tech-descriptions :deep(.arco-descriptions-item-value) {
  background: transparent !important; 
  color: #e8f6ff !important;
  font-size: 16px; 
  padding: 16px 24px !important;
}

.highlight-date {
  color: #9fd4f2;
  font-size: 16px;
}

.tech-tag {
  background: rgba(0, 229, 255, 0.1);
  border: 1px solid #00e5ff;
  color: #00e5ff;
  font-size: 14px;
  padding: 0 10px;
}

.action-footer {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  gap: 20px;
}

.tech-btn-primary {
  background: linear-gradient(90deg, #0088ff, #00e5ff) !important;
  border: none !important;
  color: #fff !important;
  font-weight: bold;
  font-size: 16px; 
  padding: 0 32px;
  height: 36px;
}

.tech-btn-secondary {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #bfe9ff !important;
  font-size: 16px; 
  padding: 0 32px;
  height: 36px;
}

/* ===== Markdown 深色样式 ===== */
.body-text {
  line-height: 1.8;
  font-size: 17px; 
}

:deep(.markdown-body) {
  background-color: transparent !important;
  color: #dbf2ff !important;
  font-size: 17px; 
  line-height: 1.8;
}

:deep(.markdown-body strong),
:deep(.markdown-body b) {
  text-shadow: none !important; 
  font-weight: 800 !important;
}

:deep(.markdown-body table tr) { 
  background-color: transparent !important; 
}
:deep(.markdown-body table th) { 
  background-color: rgba(0, 229, 255, 0.1) !important; 
  color: #00e5ff; 
  font-size: 16px; 
}
:deep(.markdown-body table td) {
  font-size: 16px; 
}
:deep(.markdown-body table td), 
:deep(.markdown-body table th) {
  border: 1px solid rgba(0, 229, 255, 0.2) !important;
}

:deep(.markdown-body blockquote) {
  background: rgba(0, 229, 255, 0.05) !important;
  border-left: 4px solid #00e5ff !important;
}

/* ===== 浅色主题覆盖 ===== */
:global(body.theme-light) .page-contrast .back-link,
.page-contrast.theme-light .back-link {
  color: #0066cc !important;
}
:global(body.theme-light) .page-contrast .back-link:hover,
.page-contrast.theme-light .back-link:hover {
  text-shadow: 0 0 8px rgba(0, 102, 204, 0.4) !important;
}

:global(body.theme-light) .page-contrast .custom-header :deep(.arco-page-header-title),
.page-contrast.theme-light .custom-header :deep(.arco-page-header-title) {
  color: #0a2f4d !important;
  text-shadow: none !important;
}
:global(body.theme-light) .page-contrast .custom-header :deep(.arco-page-header-sub-title),
.page-contrast.theme-light .custom-header :deep(.arco-page-header-sub-title) {
  color: #1f5a85 !important;
}

:global(body.theme-light) .page-contrast .detail-card,
.page-contrast.theme-light .detail-card {
  background: rgba(235, 246, 255, 0.92) !important;
  border-color: rgba(74, 140, 198, 0.28) !important;
}

:global(body.theme-light) .page-contrast .tech-descriptions,
.page-contrast.theme-light .tech-descriptions {
  border-color: rgba(74, 140, 198, 0.35) !important;
}

:global(body.theme-light) .page-contrast .tech-descriptions :deep(.arco-descriptions-item-label),
:global(body.theme-light) .page-contrast .tech-descriptions :deep(.arco-descriptions-item-value),
.page-contrast.theme-light .tech-descriptions :deep(.arco-descriptions-item-label),
.page-contrast.theme-light .tech-descriptions :deep(.arco-descriptions-item-value) {
  border-bottom-color: rgba(74, 140, 198, 0.3) !important;
}

:global(body.theme-light) .page-contrast .tech-descriptions :deep(.arco-descriptions-item-label),
.page-contrast.theme-light .tech-descriptions :deep(.arco-descriptions-item-label) {
  background: #eef5fc !important;
  color: #0a2f4d !important;
}

:global(body.theme-light) .page-contrast .tech-descriptions :deep(.arco-descriptions-item-value),
.page-contrast.theme-light .tech-descriptions :deep(.arco-descriptions-item-value) {
  color: #103a60 !important;
}

:global(body.theme-light) .page-contrast .highlight-date,
.page-contrast.theme-light .highlight-date {
  color: #1a5f8a !important;
}

:global(body.theme-light) .page-contrast .tech-tag,
.page-contrast.theme-light .tech-tag {
  background: rgba(0, 102, 204, 0.1) !important;
  border-color: #0066cc !important;
  color: #0066cc !important;
}

:global(body.theme-light) .page-contrast .tech-btn-primary,
.page-contrast.theme-light .tech-btn-primary {
  background: linear-gradient(90deg, #1e6eb5, #00aacc) !important;
  color: #fff !important;
}

:global(body.theme-light) .page-contrast .tech-btn-secondary,
.page-contrast.theme-light .tech-btn-secondary {
  background: rgba(0, 0, 0, 0.03) !important;
  border-color: rgba(0, 0, 0, 0.15) !important;
  color: #0a2f4d !important;
}

/* Markdown 浅色样式 */
:global(body.theme-light) .page-contrast :deep(.markdown-body),
.page-contrast.theme-light :deep(.markdown-body) {
  color: #103a60 !important;
}

:global(body.theme-light) .page-contrast :deep(.markdown-body table th),
.page-contrast.theme-light :deep(.markdown-body table th) {
  background-color: rgba(0, 102, 204, 0.1) !important;
  color: #0a2f4d !important;
}

:global(body.theme-light) .page-contrast :deep(.markdown-body table td),
:global(body.theme-light) .page-contrast :deep(.markdown-body table th),
.page-contrast.theme-light :deep(.markdown-body table td),
.page-contrast.theme-light :deep(.markdown-body table th) {
  border-color: rgba(74, 140, 198, 0.3) !important;
}

:global(body.theme-light) .page-contrast :deep(.markdown-body blockquote),
.page-contrast.theme-light :deep(.markdown-body blockquote) {
  background: rgba(0, 102, 204, 0.05) !important;
  border-left-color: #0066cc !important;
}

/* 空状态描述文字 */
:global(body.theme-light) .page-contrast :deep(.arco-empty-description),
.page-contrast.theme-light :deep(.arco-empty-description) {
  color: #1a5f8a !important;
}
</style>