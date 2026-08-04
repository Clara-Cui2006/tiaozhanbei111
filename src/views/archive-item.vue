<template>
  <div class="archive-item-page" :class="{ 'theme-light': themeMode === 'light' }">
    <BackHome />
    <a-button type="text" class="back-archive" @click="router.push('/archive')">← 返回往期窗口</a-button>
    <a-page-header :title="article?.title || '往期文章详情'" subtitle="Archive Article" />

    <a-card :bordered="false" style="margin-top: 16px">
      <div class="meta">发布时间：{{ article?.publishTime || '-' }}</div>
      <div class="meta">栏目：{{ article?.category || '-' }}</div>
      <div class="content">{{ article?.content || article?.summary || '暂无正文内容' }}</div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BackHome from '../components/back-home.vue'
import { fetchArchiveItemDetail } from '../api/platform'
import type { ArchiveItem } from '../types/platform'

const route = useRoute()
const router = useRouter()
const article = ref<ArchiveItem | null>(null)

// ---------- 主题检测 ----------
const isLightTheme = () => localStorage.getItem('platform:theme-mode') === 'light'
const themeMode = ref<'light' | 'dark'>(isLightTheme() ? 'light' : 'dark')

const updateTheme = () => {
  themeMode.value = isLightTheme() ? 'light' : 'dark'
}

let themeObserver: MutationObserver | null = null

const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'platform:theme-mode') updateTheme()
}

const setupThemeObserver = () => {
  themeObserver = new MutationObserver(() => updateTheme())
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
}

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) return
  article.value = await fetchArchiveItemDetail(id)

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
.archive-item-page :deep(.arco-page-header-title) {
  color: #eff9ff;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.4;
}
.archive-item-page :deep(.arco-page-header-sub-title) {
  color: #bde7ff;
  font-size: 14px;
  font-weight: 400;
}
.archive-item-page :deep(.arco-card) {
  background: rgba(14, 39, 78, 0.78);
  border-color: rgba(110, 196, 255, 0.2);
}

.back-archive {
  padding-left: 0 !important;
  color: #bfe9ff;
  font-size: 15px;
  font-weight: 500;
  transition: color 0.2s;
  margin-bottom: 8px;
}
.back-archive:hover {
  color: #8cd4ff;
  background: transparent !important;
}

.meta {
  color: #95cdef;
  font-size: 14px;
  line-height: 1.8;
  margin-bottom: 10px;
}
.meta:last-of-type {
  margin-bottom: 20px;
}

.content {
  white-space: pre-wrap;
  line-height: 1.9;
  color: #d7f2ff;
  font-size: 16px;
  word-break: break-word;
}

/* ===== 浅色主题覆盖（通过组件自身类名） ===== */
.archive-item-page.theme-light :deep(.arco-page-header-title) {
  color: #0a2f4d !important;
}
.archive-item-page.theme-light :deep(.arco-page-header-sub-title) {
  color: #1f5a85 !important;
}
.archive-item-page.theme-light :deep(.arco-card) {
  background: rgba(235, 246, 255, 0.94) !important;
  border-color: rgba(74, 140, 198, 0.28) !important;
}
.archive-item-page.theme-light .back-archive {
  color: #0a2f4d !important;
}
.archive-item-page.theme-light .back-archive:hover {
  color: #1e6eb5 !important;
}
.archive-item-page.theme-light .meta {
  color: #1a3f5c !important;
}
.archive-item-page.theme-light .content {
  color: #0a2f4d !important;
}
</style>