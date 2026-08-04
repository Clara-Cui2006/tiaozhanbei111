<template>
  <div class="page-contrast" :class="{ 'theme-light': themeMode === 'light' }">
    <div class="nav-row">
      <BackHome />
      <a-button type="text" class="back-link" @click="router.push('/dashboard')">← 返回风险预警态势盘</a-button>
      <a-button type="text" class="back-link" @click="goBack">← 返回普法方案</a-button>
      <a-button type="text" class="back-link" @click="router.push('/political-security')">← 返回政治安全</a-button>
    </div>
    
    <a-page-header title="新增普法方案" subtitle="结合 AI 大模型自动生成社区法治宣教方案" />

    <a-card :bordered="false" class="form-card">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="title" label="方案主题">
              <a-input v-model="form.title" placeholder="例如：防范电信网络诈骗普法宣传" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="community" label="目标社区">
              <a-input v-model="form.community" placeholder="例如：西长安街街道" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="group" label="适用人群">
              <a-input v-model="form.group" placeholder="例如：老年人、企业财务" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="scene" label="触发场景 / 原因">
              <a-input v-model="form.scene" placeholder="例如：近期该辖区发生多起诈骗案件" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item>
          <a-button type="outline" status="primary" :loading="isGenerating" @click="generateWithAI">
            🤖 AI 一键生成普法方案内容
          </a-button>
          <div class="ai-tip-bar">
            填写上方基础信息后，点击此按钮可调用法务大模型一键撰写带排版的方案正文。
          </div>
        </a-form-item>

        <a-form-item field="content" label="方案正文内容">
          <a-textarea
            v-model="form.content"
            class="edit-area"
            placeholder="请在此编写普法方案的详细内容，或使用上方 AI 自动生成..."
            :auto-size="{ minRows: 12, maxRows: 30 }"
            allow-clear
          />
        </a-form-item>

        <a-form-item>
          <a-space>
            <a-button type="primary" :loading="saving" @click="handleSave">
              保存并发布方案
            </a-button>
            <a-button @click="goBack">取消</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { FormInstance } from '@arco-design/web-vue'
import { useRouter, useRoute } from 'vue-router'
import BackHome from '../components/back-home.vue'
import { createLegalRecommendation } from '../api/platform'
import { chatWithLLM } from '../services/llm'

const router = useRouter()
const route = useRoute()
const formRef = ref<FormInstance>()
const saving = ref(false)
const isGenerating = ref(false)

const form = ref({
  title: '',
  community: '',
  group: '',
  scene: '',
  content: ''
})

const rules = {
  title: [{ required: true, message: '请输入方案主题' }],
  content: [{ required: true, message: '请填写方案正文内容' }]
}

// 主题模式适配
const isLightTheme = () => localStorage.getItem('platform:theme-mode') === 'light'
const themeMode = ref<'light' | 'dark'>(isLightTheme() ? 'light' : 'dark')
const updateTheme = () => { themeMode.value = isLightTheme() ? 'light' : 'dark' }
let themeObserver: MutationObserver | null = null
const handleStorageChange = (e: StorageEvent) => { if (e.key === 'platform:theme-mode') updateTheme() }

onMounted(() => {
  if (route.query.community) {
    form.value.community = route.query.community as string
  }

  updateTheme()
  window.addEventListener('storage', handleStorageChange)
  themeObserver = new MutationObserver(() => updateTheme())
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
  themeObserver?.disconnect()
})

const goBack = () => { router.push('/legal-recommend') }

const generateWithAI = async () => {
  if (!form.value.title && !form.value.scene) {
    Message.warning('请先至少填写“方案主题”或“触发场景”，AI 才能精准生成')
    return
  }
  isGenerating.value = true
  try {
    const prompt = `请作为专业的社区法务工作者，为【${form.value.community || '本社区'}】生成一份普法方案草案。
主题：${form.value.title || '常规法治宣教'}
适用人群：${form.value.group || '社区居民'}
触发场景：${form.value.scene || '日常防范预警与普法'}

要求：
1. 请务必使用 Markdown 格式排版，包含各级标题（#、##）、加粗、列表等，以确保查看详情时渲染美观。
2. 包含方案背景与目标。
3. 包含具体的普法形式（如线上推送、线下讲座）。
4. 包含核心普法知识点与法条引用。
5. 直接输出正文，无需任何寒暄用语。`

    const result = await chatWithLLM(prompt, 'dashboard')
    form.value.content = result
    Message.success('AI 普法方案生成成功！')
  } catch (e) {
    Message.error('AI 生成失败，请重试')
  } finally {
    isGenerating.value = false
  }
}

const handleSave = async () => {
  const err = await formRef.value?.validate()
  if (err) return
  saving.value = true
  try {
    await createLegalRecommendation(form.value)
    Message.success('普法方案已成功创建并下发')
    router.push('/legal-recommend')
  } catch (e) {
    Message.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.nav-row { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
.back-link { padding-left: 0; color: #bfe9ff; font-weight: 600; font-size: 14px; transition: color 0.3s; }
.back-link:hover { color: #00e5ff; }

.page-contrast :deep(.arco-page-header-title) { color: #eff9ff; font-size: 22px; font-weight: 600; }
.page-contrast :deep(.arco-page-header-sub-title) { color: #bde7ff; font-size: 14px; }
.form-card { margin-top: 12px; border: 1px solid rgba(93, 191, 255, 0.22); background: linear-gradient(180deg, rgba(14, 39, 78, 0.78), rgba(9, 24, 47, 0.86)); }

.page-contrast :deep(.arco-form-item-label) { color: #c8e8ff; font-size: 16px; font-weight: 500; }
.page-contrast :deep(.arco-input), .page-contrast :deep(.arco-textarea) { background: rgba(8, 23, 44, 0.85); color: #e8f6ff; border-color: rgba(110, 196, 255, 0.25); font-size: 15px; }
.page-contrast :deep(.arco-input::placeholder), .page-contrast :deep(.arco-textarea::placeholder) { color: rgba(200, 232, 255, 0.5); }

.ai-tip-bar { margin-top: 8px; margin-left: 12px; padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(90, 214, 255, 0.35); background: rgba(90, 214, 255, 0.12); color: #8ad6ff; font-size: 13px; }

/* 修复浅色模式下文本域与组件样式 */
.edit-area {
  background: #0d1624 !important;
  color: #d8f2ff !important;
  border: 1px solid rgba(0, 229, 255, 0.3) !important;
  font-family: monospace;
  font-size: 15px;
  border-radius: 6px;
}

:global(body.theme-light) .page-contrast .back-link, .page-contrast.theme-light .back-link { color: #0066cc !important; }
:global(body.theme-light) .page-contrast .back-link:hover, .page-contrast.theme-light .back-link:hover { color: #004499 !important; }
:global(body.theme-light) .page-contrast :deep(.arco-page-header-title), .page-contrast.theme-light :deep(.arco-page-header-title) { color: #0a2f4d !important; }
:global(body.theme-light) .page-contrast :deep(.arco-page-header-sub-title), .page-contrast.theme-light :deep(.arco-page-header-sub-title) { color: #1f5a85 !important; }
:global(body.theme-light) .page-contrast .form-card, .page-contrast.theme-light .form-card { background: rgba(235, 246, 255, 0.92) !important; border-color: rgba(74, 140, 198, 0.28) !important; }
:global(body.theme-light) .page-contrast :deep(.arco-form-item-label), .page-contrast.theme-light :deep(.arco-form-item-label) { color: #0a2f4d !important; }
:global(body.theme-light) .page-contrast .ai-tip-bar, .page-contrast.theme-light .ai-tip-bar { background: rgba(22, 93, 255, 0.1) !important; border-color: rgba(22, 93, 255, 0.3) !important; color: #165dff !important; }

/* 核心修复：输入框包裹层的灰色背景移除，并将字体统一设为黑色 */
:global(body.theme-light) .page-contrast .edit-area,
.page-contrast.theme-light .edit-area,
:global(body.theme-light) .page-contrast :deep(.arco-textarea-wrapper),
.page-contrast.theme-light :deep(.arco-textarea-wrapper),
:global(body.theme-light) .page-contrast :deep(.arco-input-wrapper),
.page-contrast.theme-light :deep(.arco-input-wrapper),
:global(body.theme-light) .page-contrast :deep(.arco-input),
.page-contrast.theme-light :deep(.arco-input),
:global(body.theme-light) .page-contrast :deep(.arco-textarea),
.page-contrast.theme-light :deep(.arco-textarea) {
  background: #ffffff !important;
  background-color: #ffffff !important;
  color: #1d2129 !important;
  border-color: rgba(74, 140, 198, 0.4) !important;
}
:global(body.theme-light) .page-contrast :deep(.arco-input::placeholder),
:global(body.theme-light) .page-contrast :deep(.arco-textarea::placeholder),
.page-contrast.theme-light :deep(.arco-input::placeholder),
.page-contrast.theme-light :deep(.arco-textarea::placeholder) { 
  color: rgba(29, 33, 41, 0.5) !important; 
}
</style>