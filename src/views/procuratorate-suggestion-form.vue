<template>
  <div class="page-contrast" :class="{ 'theme-light': themeMode === 'light' }">
    <div class="nav-row">
      <BackHome />
      <a-button type="text" class="back-link" @click="router.push('/dashboard')">← 返回风险预警态势盘</a-button>
      <a-button type="text" class="back-link" @click="goList">← 返回检察建议</a-button>
      <a-button type="text" class="back-link" @click="router.push('/political-security')">← 返回政治安全</a-button>
    </div>
    <a-page-header 
      :title="pageTitle" 
      :subtitle="isPolitical ? '核心政务区敏感风险感知与预警专属通道' : 'Procuratorate Suggestion Form'" 
    >
      <template #tags v-if="isPolitical">
        <a-tag color="red">高保密级</a-tag>
        <a-tag color="arcoblue">加密定向推送</a-tag>
      </template>
    </a-page-header>

    <a-card :bordered="false" class="form-card" :class="{'political-card': isPolitical}">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item field="title" label="建议标题">
          <a-input v-model="form.title" placeholder="请输入建议标题" allow-clear />
        </a-form-item>
        
        <template v-if="isPolitical">
          <a-form-item field="politicalCategory" label="风险领域标签 (政治安全专属)">
            <a-select v-model="form.politicalCategory" placeholder="请选择敏感风险分类">
              <a-option value="危害国家安全类">危害国家安全类 (间谍、分裂、颠覆等)</a-option>
              <a-option value="极端宗教与意识形态渗透类">极端宗教与意识形态渗透类</a-option>
              <a-option value="重大活动安保风险类">重大活动安保风险类</a-option>
              <a-option value="网络政治安全类">网络政治安全类</a-option>
            </a-select>
          </a-form-item>
        </template>
        <template v-else>
          <a-form-item field="type" label="建议类型">
            <a-select v-model="form.type" placeholder="请选择类型">
              <a-option value="刑事检察">刑事检察</a-option>
              <a-option value="民事检察">民事检察</a-option>
              <a-option value="行政检察">行政检察</a-option>
              <a-option value="公益诉讼检察">公益诉讼检察</a-option>
            </a-select>
          </a-form-item>
        </template>

        <a-form-item field="target" label="建议对象 (定向投递)">
          <a-input v-model="form.target" placeholder="如：某保密单位、街道或政保部门" allow-clear />
        </a-form-item>

        <a-form-item>
          <a-button type="outline" :status="isPolitical ? 'danger' : 'normal'" :loading="isGenerating" @click="generateWithAI">
            🤖 AI 辅助生成 {{ isPolitical ? '(已启用政治安全风险识别引擎)' : '' }}
          </a-button>
          <div class="ai-tip-bar" :class="{'ai-tip-danger': isPolitical}">
            {{ isPolitical ? '⚠️ 注意：当前生成的文书涉及敏感信息，请勿在互联网环境直接流转。' : 'AI生成仅供参考，用户需自行仔细审核' }}
          </div>
        </a-form-item>
        
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="issueDate" label="发布日期">
              <a-date-picker v-model="form.issueDate" style="width: 100%" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="status" label="状态">
              <a-select v-model="form.status" placeholder="请选择状态">
                <a-option value="待处理">待处理</a-option>
                <a-option value="处理中">处理中</a-option>
                <a-option value="已反馈">已反馈</a-option>
                <a-option value="已驳回">已驳回</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-form-item field="content" label="建议正文">
          <a-textarea
            v-model="form.content"
            :placeholder="isPolitical ? '请填写敏感时空数据、关联主体画像、重大活动安保动向等加密数据...' : '请填写建议依据、问题描述与具体建议事项'"
            :auto-size="{ minRows: 8, maxRows: 20 }"
            allow-clear
          />
        </a-form-item>
        
        <a-form-item>
          <a-space>
            <a-button type="primary" :status="isPolitical ? 'danger' : 'normal'" :loading="saving" @click="handleSave">
              {{ isPolitical ? '签发并加密投递' : '保存' }}
            </a-button>
            <a-button @click="goList">取消</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { FormInstance } from '@arco-design/web-vue'
import { useRoute, useRouter } from 'vue-router'
import BackHome from '../components/back-home.vue'
import {
  fetchProcuratorateSuggestionById,
  createProcuratorateSuggestion,
  updateProcuratorateSuggestion
} from '../api/platform'
import type { ProcuratorateSuggestionInput, PoliticalSecurityCategory } from '../types/platform'
import { chatWithLLM } from '../services/llm'
import { USER_PROMPT_TEMPLATES } from '../services/prompts'

const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const saving = ref(false)
const isGenerating = ref(false)

// 彻底弃用 route.name 判断，改用参数是否存在 id 来判断，极其稳定
const isNew = computed(() => !route.query.id && !route.params.id)
const editId = computed(() => (isNew.value ? null : Number(route.query.id || route.params.id)))

// 判断是否为政治安全专属表单
const isPolitical = computed(() => route.query.type === 'political')

const pageTitle = computed(() => {
  if (isPolitical.value) return isNew.value ? '新建政治安全专属建议' : '编辑政治安全专属建议'
  return isNew.value ? '新建检察建议' : '编辑检察建议'
})

const today = () => new Date().toISOString().slice(0, 10)

const form = ref<ProcuratorateSuggestionInput>({
  title: '',
  type: isPolitical.value ? '政治安全专办' : '行政检察',
  politicalCategory: isPolitical.value ? '重大活动安保风险类' : undefined,
  content: '',
  target: '',
  issueDate: today(),
  status: '待处理',
  isPolitical: isPolitical.value
})

const rules = computed(() => {
  const baseRules: any = {
    title: [{ required: true, message: '请输入建议标题' }],
    target: [{ required: true, message: '请输入建议对象' }],
    issueDate: [{ required: true, message: '请选择发布日期' }],
    status: [{ required: true, message: '请选择状态' }],
    content: [{ required: true, message: '请填写建议正文' }]
  }
  if (isPolitical.value) {
    baseRules.politicalCategory = [{ required: true, message: '请选择政治安全风险分类' }]
  } else {
    baseRules.type = [{ required: true, message: '请选择建议类型' }]
  }
  return baseRules
})

const isLightTheme = () => localStorage.getItem('platform:theme-mode') === 'light'
const themeMode = ref<'light' | 'dark'>(isLightTheme() ? 'light' : 'dark')

const updateTheme = () => { themeMode.value = isLightTheme() ? 'light' : 'dark' }

let themeObserver: MutationObserver | null = null
const handleStorageChange = (e: StorageEvent) => { if (e.key === 'platform:theme-mode') updateTheme() }

const setupThemeObserver = () => {
  themeObserver = new MutationObserver(() => updateTheme())
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
}

const goList = () => { router.push('/procuratorate-suggestion') }

onMounted(async () => {
  // 如果是新建，并且有地图组件传过来的 community，自动填充给 target（建议对象）
  if (isNew.value && route.query.community) {
    form.value.target = route.query.community as string
  }

  if (!isNew.value) {
    const id = editId.value
    if (!id) return
    try {
      const row = await fetchProcuratorateSuggestionById(id)
      form.value = {
        title: row.title,
        type: row.type,
        content: row.content,
        target: row.target,
        issueDate: row.issueDate,
        status: row.status,
        isPolitical: row.isPolitical,
        politicalCategory: (row as any).politicalCategory
      }
    } catch {
      Message.error('无法加载建议，可能已被忽略')
      goList()
    }
  }

  updateTheme()
  window.addEventListener('storage', handleStorageChange)
  setupThemeObserver()
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
  themeObserver?.disconnect()
})

const generateWithAI = async () => {
  if ((!form.value.type && !form.value.politicalCategory) && !form.value.target) {
    Message.warning('请先填写建议对象和分类，以便 AI 生成更准确的内容')
    return
  }
  isGenerating.value = true
  try {
    let injectType = isPolitical.value ? `政治安全预警 (${form.value.politicalCategory})` : form.value.type || '行政检察'
    let prompt = USER_PROMPT_TEMPLATES.procuratorate({
      type: injectType,
      target: form.value.target || '相关单位'
    })

    if (isPolitical.value) {
      prompt += `\n额外要求：此文书属高度保密性质，请务必以“政治安全与维护核心政务区稳定”为切入点，结合空间邻近度与重大活动安保要求，输出规范的检察建议提示。`
    }

    const result = await chatWithLLM(prompt, 'procuratorate')
    const titleMatch = result.match(/【标题】(.+?)(?:\n|【)/)
    const contentMatch = result.match(/【正文】([\s\S]+)/)
    if (titleMatch?.[1]) form.value.title = titleMatch[1].trim()
    if (contentMatch?.[1]) form.value.content = contentMatch[1].trim()
    Message.success('AI辅助草稿已生成，正式使用前必须由检察官人工审核')
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
    if (isNew.value) {
      await createProcuratorateSuggestion(form.value)
      Message.success(isPolitical.value ? '专属风险预警已加密投递至安全通道' : '已新建检察建议')
    } else {
      const id = editId.value
      if (!id) return
      await updateProcuratorateSuggestion(id, form.value)
      Message.success('已保存修改')
    }
    goList()
  } catch (e) {
    Message.error(e instanceof Error ? e.message : '保存失败')
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

.political-card { border: 1px solid rgba(245, 63, 63, 0.4); box-shadow: inset 0 0 20px rgba(245, 63, 63, 0.05); }

.page-contrast :deep(.arco-form-item-label) { color: #c8e8ff; font-size: 16px; font-weight: 500; }
.page-contrast :deep(.arco-input), .page-contrast :deep(.arco-textarea), .page-contrast :deep(.arco-select-view-single), .page-contrast :deep(.arco-picker) { background: rgba(8, 23, 44, 0.85); color: #e8f6ff; border-color: rgba(110, 196, 255, 0.25); font-size: 15px; }
.page-contrast :deep(.arco-input::placeholder), .page-contrast :deep(.arco-textarea::placeholder) { color: rgba(200, 232, 255, 0.5); }

.ai-tip-bar { margin-top: 8px; padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255, 199, 122, 0.35); background: rgba(255, 199, 122, 0.12); color: #ffd89a; font-size: 13px; line-height: 1.5; }
.ai-tip-danger { border-color: rgba(245, 63, 63, 0.5); background: rgba(245, 63, 63, 0.1); color: #ff8a8a; }

:global(body.theme-light) .page-contrast .back-link, .page-contrast.theme-light .back-link { color: #0066cc !important; }
:global(body.theme-light) .page-contrast .back-link:hover, .page-contrast.theme-light .back-link:hover { color: #004499 !important; }
:global(body.theme-light) .page-contrast :deep(.arco-page-header-title), .page-contrast.theme-light :deep(.arco-page-header-title) { color: #0a2f4d !important; }
:global(body.theme-light) .page-contrast :deep(.arco-page-header-sub-title), .page-contrast.theme-light :deep(.arco-page-header-sub-title) { color: #1f5a85 !important; }
:global(body.theme-light) .page-contrast .form-card, .page-contrast.theme-light .form-card { background: rgba(235, 246, 255, 0.92) !important; border-color: rgba(74, 140, 198, 0.28) !important; }
:global(body.theme-light) .page-contrast .political-card, .page-contrast.theme-light .political-card { border-color: rgba(245, 63, 63, 0.45) !important; background: linear-gradient(180deg, rgba(255, 240, 240, 0.95), rgba(255, 248, 248, 0.95)) !important; }
:global(body.theme-light) .page-contrast :deep(.arco-form-item-label), .page-contrast.theme-light :deep(.arco-form-item-label) { color: #0a2f4d !important; }
:global(body.theme-light) .page-contrast .ai-tip-bar, .page-contrast.theme-light .ai-tip-bar { background: rgba(255, 215, 120, 0.15) !important; border-color: rgba(200, 150, 50, 0.35) !important; color: #7a5a20 !important; }
:global(body.theme-light) .page-contrast .ai-tip-danger, .page-contrast.theme-light .ai-tip-danger { background: rgba(245, 63, 63, 0.08) !important; border-color: rgba(245, 63, 63, 0.4) !important; color: #d9363e !important; }

/* 核心修复：输入框包裹层的灰色背景移除，并将字体统一设为黑色 */
:global(body.theme-light) .page-contrast :deep(.arco-input),
:global(body.theme-light) .page-contrast :deep(.arco-input-wrapper),
:global(body.theme-light) .page-contrast :deep(.arco-textarea),
:global(body.theme-light) .page-contrast :deep(.arco-textarea-wrapper),
:global(body.theme-light) .page-contrast :deep(.arco-select-view-single),
:global(body.theme-light) .page-contrast :deep(.arco-picker),
.page-contrast.theme-light :deep(.arco-input),
.page-contrast.theme-light :deep(.arco-input-wrapper),
.page-contrast.theme-light :deep(.arco-textarea),
.page-contrast.theme-light :deep(.arco-textarea-wrapper),
.page-contrast.theme-light :deep(.arco-select-view-single),
.page-contrast.theme-light :deep(.arco-picker) { 
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
