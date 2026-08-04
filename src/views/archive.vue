<template>
  <div class="archive-page">
    <a-page-header title="往期窗口" subtitle="历史信息归档中心" />

    <a-card :bordered="false" style="margin-top: 16px">
      <a-tabs v-model:active-key="activeTab" @change="loadArchive">
        <a-tab-pane key="新闻资讯" title="新闻资讯" />
        <a-tab-pane key="往期公告" title="往期公告" />
        <a-tab-pane key="官微推送" title="官微推送" />
        <a-tab-pane key="其他栏目" title="其他栏目" />
      </a-tabs>

      <a-list :data="archiveItems" :bordered="false">
        <template #item="{ item }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                <a-link :hoverable="true" status="normal" @click="goArchiveDetail(item.id)">{{ item.title }}</a-link>
              </template>
              <template #description>
                <div class="item-summary">{{ item.summary || '暂无摘要' }}</div>
                <div class="item-time">发布时间：{{ item.publishTime }}</div>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchArchiveItems } from '../api/platform'
import type { ArchiveCategory, ArchiveItem } from '../types/platform'

const router = useRouter()
const activeTab = ref<ArchiveCategory>('新闻资讯')
const archiveItems = ref<ArchiveItem[]>([])

const loadArchive = async () => {
  archiveItems.value = await fetchArchiveItems(activeTab.value)
}

const goArchiveDetail = (id: number) => {
  router.push(`/archive-item/${id}`)
}

onMounted(loadArchive)
</script>

<style scoped>
/* ===== 基础深色样式（默认） ===== */
.archive-page :deep(.arco-page-header-title) {
  color: #eff9ff;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.4;
}
.archive-page :deep(.arco-page-header-sub-title) {
  color: #bde7ff;
  font-size: 14px;
  font-weight: 400;
}
.archive-page :deep(.arco-card) {
  background: rgba(14, 39, 78, 0.78);
  border-color: rgba(110, 196, 255, 0.2);
}

/* 标签页样式 —— 修复背景未覆盖圆角 */
.archive-page :deep(.arco-tabs-nav-tab) {
  padding: 4px 0;
}
.archive-page :deep(.arco-tabs-tab) {
  color: #c2e2ff;
  font-size: 16px;
  font-weight: 500;
  border-radius: 6px !important;      /* 确保背景圆角 */
  margin-right: 8px;
  padding: 6px 16px;
  transition: all 0.2s;
}
.archive-page :deep(.arco-tabs-tab:hover) {
  color: #e2f2ff;
  background: rgba(117, 173, 218, 0.25);
  border-radius: 6px !important;
}
.archive-page :deep(.arco-tabs-tab-active),
.archive-page :deep(.arco-tabs-tab-active:hover) {
  color: #ffffff;
  background: linear-gradient(180deg, rgba(152, 203, 243, 0.95), rgba(127, 187, 234, 0.95));
  font-weight: 600;
  border-radius: 6px !important;
}

/* 列表项 */
.archive-page :deep(.arco-list-item) {
  border-bottom-color: rgba(120, 196, 255, 0.2);
  padding: 16px 0;
}
.archive-page :deep(.arco-list-item-meta-title) {
  margin-bottom: 6px;
}
.archive-page :deep(.arco-link) {
  color: #d0ebff;
  font-size: 18px;
  font-weight: 600;                   /* 标题加粗 */
  transition: color 0.2s;
}
.archive-page :deep(.arco-link:hover) {
  color: #7bcbff;
}
.item-summary {
  color: #3e9ae6;
  font-size: 15px;
  line-height: 1.65;
  margin-bottom: 6px;
}
.item-time {
  color: #61a6d4;
  font-size: 13px;
  font-weight: 400;
}

/* ===== 浅色主题覆盖 ===== */
:global(body.theme-light) .archive-page :deep(.arco-page-header-title),
.archive-page.theme-light :deep(.arco-page-header-title) {
  color: #0a2f4d !important;
  font-size: 24px;
  font-weight: 600;
}
:global(body.theme-light) .archive-page :deep(.arco-page-header-sub-title),
.archive-page.theme-light :deep(.arco-page-header-sub-title) {
  color: #1f5a85 !important;
  font-size: 14px;
}
:global(body.theme-light) .archive-page :deep(.arco-card),
.archive-page.theme-light :deep(.arco-card) {
  background: rgba(235, 246, 255, 0.92) !important;
  border-color: rgba(74, 140, 198, 0.28) !important;
}

/* 标签页浅色 */
:global(body.theme-light) .archive-page :deep(.arco-tabs-tab),
.archive-page.theme-light :deep(.arco-tabs-tab) {
  color: #0f3a60 !important;
  font-size: 16px;
  font-weight: 500;
  border-radius: 6px !important;
}
:global(body.theme-light) .archive-page :deep(.arco-tabs-tab:hover),
.archive-page.theme-light :deep(.arco-tabs-tab:hover) {
  color: #082a45 !important;
  background: rgba(117, 173, 218, 0.22) !important;
}
:global(body.theme-light) .archive-page :deep(.arco-tabs-tab-active),
.archive-page.theme-light :deep(.arco-tabs-tab-active),
:global(body.theme-light) .archive-page :deep(.arco-tabs-tab-active:hover),
.archive-page.theme-light :deep(.arco-tabs-tab-active:hover) {
  color: #082a45 !important;
  background: linear-gradient(180deg, rgba(152, 203, 243, 0.95), rgba(127, 187, 234, 0.95)) !important;
  font-weight: 600;
  border-radius: 6px !important;
}

/* 列表项浅色 */
:global(body.theme-light) .archive-page :deep(.arco-list-item),
.archive-page.theme-light :deep(.arco-list-item) {
  border-bottom-color: rgba(74, 140, 198, 0.25) !important;
}
/* 标题链接 —— 加深颜色并加粗放大 */
:global(body.theme-light) .archive-page :deep(.arco-link),
.archive-page.theme-light :deep(.arco-link) {
  color: #052135 !important;          /* 更深，提高对比度 */
  font-size: 19px;                    /* 微调放大 */
  font-weight: 700 !important;        /* 加粗突出 */
}
:global(body.theme-light) .archive-page :deep(.arco-link:hover),
.archive-page.theme-light :deep(.arco-link:hover) {
  color: #1e6eb5 !important;
}
:global(body.theme-light) .archive-page :deep(.item-summary),
.archive-page.theme-light :deep(.item-summary) {
  color: #01080f !important;
  font-size: 15px;
  line-height: 1.65;
}
:global(body.theme-light) .archive-page :deep(.item-time),
.archive-page.theme-light :deep(.item-time) {
  color: #05395e !important;
  font-size: 13px;
}
</style>