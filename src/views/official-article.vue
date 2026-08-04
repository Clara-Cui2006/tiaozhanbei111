<template>
  <div class="article-page">
    <a-button type="text" class="back-link" @click="router.push('/')">← 返回主页</a-button>

    <a-page-header :title="article?.title || '文章详情'" subtitle="Official Dynamic Article" />

    <a-card :bordered="false" style="margin-top: 16px">
      <div class="meta">发布时间：{{ article?.publishTime || '-' }}</div>
      <br>
      <div 
        v-if="article?.content" 
        class="content markdown-body" 
        v-html="renderedContent"
      ></div>
      <div v-else class="content">暂无内容</div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue' // 修改点2：引入 computed
import { useRoute, useRouter } from 'vue-router'
import { fetchOfficialDynamicDetail } from '../api/platform'
import type { OfficialDynamic } from '../types/platform'
import { marked } from 'marked' // 修改点3：引入 marked 解析器
import 'github-markdown-css/github-markdown.css' // 修改点4：引入默认样式

const route = useRoute()
const router = useRouter()
const article = ref<OfficialDynamic | null>(null)

// 修改点5：添加 computed 属性，将文本动态解析为 HTML
const renderedContent = computed(() => {
  if (!article.value?.content) return ''
  return marked.parse(article.value.content)
})

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) return
  article.value = await fetchOfficialDynamicDetail(id)
})
</script>

<style scoped>
/* 基础布局 */
.article-page {
  padding: 20px;
  min-height: 100vh;
  background: radial-gradient(circle at top right, rgba(0, 70, 120, 0.2), transparent);
}

.back-link {
  padding-left: 0;
  color: #00e5ff;
  font-weight: 600;
  transition: all 0.3s;
}
.back-link:hover {
  text-shadow: 0 0 8px #00e5ff;
  transform: translateX(-5px);
}

/* 科技感容器 */
.terminal-container {
  margin-top: 24px;
  position: relative;
  border-left: 2px solid rgba(0, 229, 255, 0.3);
  padding-left: 10px;
}

.meta-info {
  font-family: 'Courier New', Courier, monospace;
  color: #91c8ea;
  font-size: 12px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}
.meta-info .label { color: #00e5ff; margin-right: 8px; }
.status-dot {
  width: 6px;
  height: 6px;
  background: #00e5ff;
  border-radius: 50%;
  margin-left: 10px;
  box-shadow: 0 0 8px #00e5ff;
  animation: blink 2s infinite;
}

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

/* 核心内容卡片：毛玻璃效果 */
.content-card {
  background: rgba(10, 25, 41, 0.7) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 229, 255, 0.15) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* =======================================================
   🌟 Markdown 深度美化 🌟 
   ======================================================= */

:deep(.markdown-body) {
  background-color: transparent !important;
  color: #dbf2ff !important;
  line-height: 1.8;
  font-size: 15px;
}

/* 标题样式：增加左侧装饰条 */
:deep(.markdown-body h1),
:deep(.markdown-body h2) {
  color: #00e5ff !important;
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.4);
  border-bottom: 1px dotted rgba(0, 229, 255, 0.3) !important;
  padding-bottom: 10px;
  display: flex;
  align-items: center;
}
:deep(.markdown-body h1::before),
:deep(.markdown-body h2::before) {
  content: "";
  width: 4px;
  height: 24px;
  background: #00e5ff;
  margin-right: 12px;
  box-shadow: 0 0 8px #00e5ff;
}

/* 重点突出：Blockquote（引用块） */
:deep(.markdown-body blockquote) {
  background: rgba(0, 229, 255, 0.05) !important;
  border-left: 4px solid #00e5ff !important;
  padding: 15px 20px !important;
  color: #bfe9ff !important;
  border-radius: 4px;
  margin: 20px 0 !important;
}

/* 列表样式优化 */
:deep(.markdown-body ul) { list-style: none !important; padding-left: 10px !important; }
:deep(.markdown-body ul li::before) {
  content: "■";
  color: #00e5ff;
  font-size: 8px;
  margin-right: 10px;
  vertical-align: middle;
  text-shadow: 0 0 5px #00e5ff;
}

/* 1. 加粗文本：从“背景色”改为“发光勾边 + 亮色” */
:deep(.markdown-body strong),
:deep(.markdown-body b) {
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 800 !important;
}

/* 表格：增加深蓝底色 */
:deep(.markdown-body table tr) { background-color: rgba(0, 0, 0, 0.2) !important; }
:deep(.markdown-body table th) { background-color: rgba(0, 229, 255, 0.1) !important; color: #00e5ff; }

/* 代码块 */
:deep(.markdown-body pre) {
  background-color: rgba(5, 10, 15, 0.8) !important;
  border: 1px solid rgba(0, 229, 255, 0.1) !important;
  border-radius: 8px;
}

/* 2. 无序列表 (■) 增强 */
:deep(.markdown-body ul li::before) {
  content: "■";
  color: #00e5ff;
  font-size: 10px;
  margin-right: 12px;
  text-shadow: 0 0 10px #00e5ff, 0 0 20px #00e5ff; /* 双层发光 */
}

/* 3. 有序列表 (数字) 增强：让数字变蓝且带括号装饰 */
:deep(.markdown-body ol) {
  list-style: none !important;
  padding-left: 10px !important;
  counter-reset: custom-counter; /* 开启自定义计数器 */
}
:deep(.markdown-body ol li) {
  counter-increment: custom-counter;
  margin-bottom: 8px;
}
:deep(.markdown-body ol li::before) {
  content: counter(custom-counter) "."; /* 自定义数字格式 */
  color: #00e5ff;
  font-family: 'Orbitron', 'Courier New', monospace; /* 如果有科技感字体更好 */
  font-weight: bold;
  margin-right: 12px;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
  display: inline-block;
  min-width: 20px;
}

/* 4. 链接美化：既然是蓝色系，链接可以做成闪烁感 */
:deep(.markdown-body a) {
  color: #00e5ff !important;
  text-decoration: none;
  border-bottom: 1px dashed #00e5ff;
}
:deep(.markdown-body a:hover) {
  background: rgba(0, 229, 255, 0.1);
  border-bottom: 1px solid #00e5ff;
}

/* 5. 分割线：做成发光的细线 */
:deep(.markdown-body hr) {
  height: 1px;
  background: linear-gradient(to right, transparent, #00e5ff, transparent);
  border: none;
  margin: 30px 0;
}

:global(body.theme-light) .article-page {
  background: radial-gradient(circle at top right, rgba(132, 185, 228, 0.28), rgba(226, 241, 255, 0.8)) !important;
}

:global(body.theme-light) .article-page :deep(.arco-page-header-title),
:global(body.theme-light) .article-page :deep(.arco-page-header-sub-title),
:global(body.theme-light) .article-page .meta,
:global(body.theme-light) .article-page .back-link,
:global(body.theme-light) .article-page .content {
  color: #103a60 !important;
}

:global(body.theme-light) .article-page :deep(.arco-card) {
  background: rgba(221, 239, 255, 0.94) !important;
  border-color: rgba(70, 136, 192, 0.32) !important;
}

:global(body.theme-light) .article-page :deep(.markdown-body) {
  color: #123f66 !important;
}

:global(body.theme-light) .article-page :deep(.markdown-body h1),
:global(body.theme-light) .article-page :deep(.markdown-body h2) {
  color: #1d4f79 !important;
  text-shadow: none !important;
  border-bottom-color: rgba(70, 136, 192, 0.32) !important;
}

:global(body.theme-light) .article-page :deep(.markdown-body h1::before),
:global(body.theme-light) .article-page :deep(.markdown-body h2::before) {
  background: #2f73ad !important;
  box-shadow: none !important;
}

:global(body.theme-light) .article-page :deep(.markdown-body blockquote) {
  background: rgba(175, 210, 239, 0.35) !important;
  border-left-color: #3a7eb8 !important;
  color: #123f66 !important;
}

:global(body.theme-light) .article-page :deep(.markdown-body strong),
:global(body.theme-light) .article-page :deep(.markdown-body b) {
  color: #082a45 !important;
  text-shadow: none !important;
}

:global(body.theme-light) .article-page :deep(.markdown-body table tr) {
  background: rgba(228, 241, 253, 0.9) !important;
}

:global(body.theme-light) .article-page :deep(.markdown-body table th) {
  background: rgba(176, 212, 241, 0.68) !important;
  color: #103a60 !important;
}

:global(body.theme-light) .article-page :deep(.markdown-body pre) {
  background: rgba(238, 247, 255, 0.95) !important;
  border-color: rgba(70, 136, 192, 0.32) !important;
}

:global(body.theme-light) .article-page :deep(.markdown-body a) {
  color: #1d4f79 !important;
  border-bottom-color: rgba(70, 136, 192, 0.58) !important;
}
</style>