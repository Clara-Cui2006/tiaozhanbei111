<template>
  <div class="plan-page">
    <div class="nav-row">
      <BackHome />
      <a-button type="text" class="back-legal" @click="goLegalRecommend">← 返回普法方案</a-button>
    </div>
    
    <a-page-header :title="plan?.title || '普法方案详情'" @back="goLegalRecommend">
      <template #extra>
        <a-tag color="red" v-if="plan?.riskContext?.riskLevel === '极高'">⚠️ 风险等级：极高</a-tag>
        <a-tag color="arcoblue" v-else>风险等级：{{ plan?.riskContext?.riskLevel || '平稳' }}</a-tag>
        <a-tag color="orange">{{ plan?.reviewStatus || '待人工审核' }}</a-tag>
      </template>
    </a-page-header>

    <a-card :bordered="false" style="margin-top: 16px">
      <a-spin :loading="loading" style="width: 100%">
        <template v-if="loadError">
          <a-empty description="未找到该普法方案或方案已下线">
            <a-button type="primary" @click="router.push('/legal-recommend')">返回普法方案</a-button>
          </a-empty>
        </template>
        
        <template v-else-if="plan">
          <div class="plan-summary-banner">
            <a-space size="large">
              <div class="summary-item">
                <span class="s-label">🎯 适用人群：</span>
                <a-tag color="blue" bordered>{{ plan.applicableGroup || '全量居民' }}</a-tag>
              </div>
              <div class="summary-item">
                <span class="s-label">⚡ 触发场景：</span>
                <a-tag color="orange" bordered>{{ plan.triggerScene || '通用治理' }}</a-tag>
              </div>
            </a-space>
          </div>

          <div class="content-section">
            <div class="section-title-row">
              <span class="section-title">📝 方案详细内容</span>
              <div class="action-btns">
                <template v-if="!isEditingContent">
                  <a-button size="mini" type="outline" @click="startEditContent">修改内容</a-button>
                  <a-button size="mini" type="outline" @click="exportWord">导出 Word</a-button>
                  <a-button size="mini" type="primary" status="warning" :loading="submittingReview" @click="submitReview">提交审核</a-button>
                </template>
                <template v-else>
                  <a-button size="mini" type="primary" status="success" :loading="savingContent" @click="saveContent">保存更改</a-button>
                  <a-button size="mini" @click="isEditingContent = false">取消</a-button>
                </template>
              </div>
            </div>
            <div class="meta" style="margin-bottom: 12px">更新时间：{{ plan?.updatedTime || '-' }}</div>
            
            <div class="content-wrapper">
              <a-textarea
                v-if="isEditingContent"
                v-model="editedContent"
                :auto-size="{ minRows: 8 }"
                class="edit-area"
                placeholder="在此输入或修改方案内容..."
              />
              <div v-else class="markdown-body" v-html="renderedContent"></div>
            </div>
          </div>

          <div class="grounding-section">
            <div class="section-header">
              <icon-thunderbolt /> 治理依据溯源 (AI 决策支持)
            </div>
            
            <a-row :gutter="24">
              <a-col :span="12">
                <div class="info-block">
                  <div class="block-title">
                    <icon-dashboard /> 风险分析结果引擎
                    <a-tag color="red" size="small" style="margin-left: 8px" v-if="plan?.relatedCategory">
                      {{ plan.relatedCategory }}
                    </a-tag>
                  </div>
                  
                  <div class="context-item" v-if="plan?.riskContext?.trendPortrait">
                    <div class="ctx-label">📈 时间趋势画像：</div>
                    <div class="ctx-value">{{ plan.riskContext.trendPortrait }}</div>
                  </div>
                  <div class="context-item" v-if="plan?.riskContext?.subjectPortrait">
                    <div class="ctx-label">👤 涉案主体画像：</div>
                    <div class="ctx-value">{{ plan.riskContext.subjectPortrait }}</div>
                  </div>
                  <div class="context-item" v-if="plan?.riskContext?.featureWords">
                    <div class="ctx-label">🏷️ 案件特征词谱：</div>
                    <div class="ctx-value">{{ plan.riskContext.featureWords }}</div>
                  </div>
                </div>
              </a-col>

              <a-col :span="12">
                <div class="info-block">
                  <div class="block-title">
                    <icon-book /> 法律政策知识图谱库
                  </div>
                  <div class="basis-list" v-if="plan?.legalBasis?.length">
                    <div class="basis-item" v-for="(item, idx) in plan.legalBasis" :key="idx">
                      <div class="basis-header">
                        <a-tag :color="item.type === '法律' ? 'blue' : 'orange'" size="small">
                          {{ item.type }}
                        </a-tag>
                        <span class="basis-name">{{ item.name }}</span>
                      </div>
                      <div class="basis-content" v-if="item.content">
                        {{ item.content }}
                      </div>
                    </div>
                  </div>
                </div>
              </a-col>
            </a-row>
          </div>

          <div class="ai-suggestion-section">
            <div class="section-title-row">
              <span class="section-title">✨ AI 治理建议与个性化普法内容</span>
              <div v-if="aiSuggestion" class="action-btns">
                <template v-if="!isEditing">
                  <a-button size="mini" type="outline" :disabled="isGenerating" @click="startEdit">修改建议</a-button>
                  <a-button size="mini" type="text" :loading="isGenerating" @click="generateAISuggestion">重新生成</a-button>
                  <a-popconfirm content="确定要删除当前的 AI 建议吗？" type="warning" @ok="deleteAISuggestion">
                    <a-button size="mini" type="outline" status="danger" :disabled="isGenerating">删除</a-button>
                  </a-popconfirm>
                </template>
                <template v-else>
                  <a-button size="mini" type="primary" status="success" @click="saveManualEdit">保存并覆盖</a-button>
                  <a-button size="mini" @click="isEditing = false">取消</a-button>
                </template>
              </div>
            </div>
            
            <div v-if="aiSuggestion" class="content-wrapper">
              <a-textarea
                v-if="isEditing"
                v-model="editedSuggestion"
                :auto-size="{ minRows: 12 }"
                class="edit-area"
                placeholder="在此输入您的修改建议..."
              />
              <div v-else class="markdown-body" v-html="renderedAiSuggestion"></div>
            </div>
            <div v-if="aiSuggestion" class="ai-tip-bar">AI生成仅供参考，用户需自行仔细审核</div>

            <div v-else class="ai-empty-box">
              <a-button type="primary" :loading="isGenerating" @click="generateAISuggestion">
                ✨ 结合风险数据生成治理建议
              </a-button>
              <span class="ai-hint" v-if="!isGenerating">点击获取基于法律图谱与风险数据的专属建议</span>
            </div>
          </div>

          <a-space style="margin-top: 24px">
            <a-button type="primary" @click="openFile" :disabled="!plan?.fileUrl">打开方案文件</a-button>
            <a-button @click="openRoute" :disabled="!plan?.pageRoute">跳转方案页面</a-button>
          </a-space>
        </template>
      </a-spin>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useRoute, useRouter } from 'vue-router'
import BackHome from '../components/back-home.vue'
import { fetchLegalPlanDetail, submitLegalRecommendationReview, updateLegalRecommendation } from '../api/platform'
import type { LegalPlan } from '../types/platform'
import { chatWithLLM } from '../services/llm'
import { USER_PROMPT_TEMPLATES } from '../services/prompts'
import { marked } from 'marked'
import 'github-markdown-css/github-markdown.css'

const route = useRoute()
const router = useRouter()
const plan = ref<LegalPlan | null>(null)
const loading = ref(true)
const loadError = ref(false)

// ---------------- 方案内容编辑态 ----------------
const isEditingContent = ref(false)
const editedContent = ref('')
const savingContent = ref(false)
const submittingReview = ref(false)

const renderedContent = computed(() => {
  if (!plan.value?.content) return '暂无方案内容'
  return marked.parse(plan.value.content)
})

const startEditContent = () => {
  editedContent.value = plan.value?.content || ''
  isEditingContent.value = true
}

const saveContent = async () => {
  if (!plan.value) return
  savingContent.value = true
  try {
    const updated = await updateLegalRecommendation(plan.value.id, {
      title: plan.value.title,
      community: plan.value.applicableGroup || '',
      group: plan.value.applicableGroup || '',
      scene: plan.value.triggerScene || '',
      content: editedContent.value
    })
    plan.value = { ...plan.value, ...updated, content: editedContent.value, reviewStatus: updated.reviewStatus || '待人工审核' }
    isEditingContent.value = false
    Message.success('已保存为待人工审核稿')
  } catch (e) {
    Message.error('保存失败，请检查权限或稍后重试')
  } finally {
    savingContent.value = false
  }
}

const exportWord = () => {
  if (!plan.value) return
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${plan.value.title}</title></head><body><h1>${plan.value.title}</h1>${renderedContent.value}</body></html>`
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${plan.value.title || '检察业务参考'}.doc`
  link.click()
  URL.revokeObjectURL(url)
  Message.success('已导出 Word 草稿，正式使用前请人工审核')
}

const submitReview = async () => {
  if (!plan.value) return
  submittingReview.value = true
  try {
    const updated = await submitLegalRecommendationReview(plan.value.id)
    plan.value = { ...plan.value, ...updated, reviewStatus: updated.reviewStatus || '已提交审核' }
    Message.success('已提交审核，等待人工确认')
  } catch (e) {
    Message.error('提交审核失败，请检查权限或稍后重试')
  } finally {
    submittingReview.value = false
  }
}

// ---------------- AI 建议编辑态 ----------------
const aiSuggestion = ref('')
const editedSuggestion = ref('')
const isEditing = ref(false)
const isGenerating = ref(false)

const getCacheKey = () => `ai_suggestion_plan_${plan.value?.id}`

const renderedAiSuggestion = computed(() => {
  if (!aiSuggestion.value) return ''
  return marked.parse(aiSuggestion.value)
})

const startEdit = () => {
  editedSuggestion.value = aiSuggestion.value
  isEditing.value = true
}

const saveManualEdit = () => {
  aiSuggestion.value = editedSuggestion.value
  localStorage.setItem(getCacheKey(), aiSuggestion.value)
  isEditing.value = false
  Message.success('建议已成功更新并覆盖本地记录')
}

const deleteAISuggestion = () => {
  aiSuggestion.value = ''
  localStorage.removeItem(getCacheKey())
  Message.success('已删除当前 AI 建议')
}

const generateAISuggestion = async () => {
  if (!plan.value) return
  isGenerating.value = true
  const relatedCategory = plan.value.relatedCategory || '未知案由';
  const trendPortrait = plan.value.riskContext?.trendPortrait || '暂无数据';
  const subjectPortrait = plan.value.riskContext?.subjectPortrait || '暂无数据';
  const featureWords = plan.value.riskContext?.featureWords || '暂无数据';
  try {
    const riskContext = [
      `风险评级：${plan.value.riskContext?.riskLevel || '平稳'}`,
      `发案时间趋势画像：${trendPortrait}`,
      `涉案主体特征画像：${subjectPortrait}`,
      `高频案件特征词谱：${featureWords}`
    ].join('\n')

    const legalBasis = plan.value.legalBasis?.map(item => `[${item.type}] ${item.name}: ${item.content}`).join('\n') || '暂无'

    const prompt = USER_PROMPT_TEMPLATES.legalPlan({
      title: plan.value.title,
      group: plan.value.applicableGroup || '社区居民',
      scene: plan.value.triggerScene || '风险预警',
      category: relatedCategory,
      riskContext,
      legalBasis
    })

    const result = await chatWithLLM(prompt, 'legalPlan')
    aiSuggestion.value = result
    localStorage.setItem(getCacheKey(), result)
    Message.success('AI 建议已根据最新风险数据生成')
  } catch (e) {
    Message.error('生成失败，请检查 API 配置')
  } finally {
    isGenerating.value = false
  }
}

const loadSavedSuggestion = () => {
  if (!plan.value?.id) return
  const saved = localStorage.getItem(getCacheKey())
  if (saved) aiSuggestion.value = saved
}

const openFile = () => {
  const url = plan.value?.fileUrl?.trim()
  if (url?.startsWith('/api')) {
    Message.info('前端演示：联调时请在 Vite 中配置 API 代理下载。')
  } else if (url) {
    window.open(url, '_blank')
  }
}

const openRoute = () => {
  const path = plan.value?.pageRoute?.trim()
  if (path) router.push(path)
  else Message.info('暂未配置方案页面路由')
}

const goLegalRecommend = () => router.push('/legal-recommend')

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) { loadError.value = true; loading.value = false; return }
  try {
    plan.value = await fetchLegalPlanDetail(id)
    loadSavedSuggestion()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* =========== 基础布局与摘要区（深色默认，浅色覆盖在下） =========== */
.nav-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}
.back-legal {
  color: #00e5ff;
  font-weight: 600;
  padding-left: 0;
  transition: all 0.3s;
}

.ai-tip-bar {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 199, 122, 0.35);
  background: rgba(255, 199, 122, 0.12);
  color: #ffd89a;
  font-size: 12px;
  line-height: 1.5;
}

.basis-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.basis-name {
  color: #d8f2ff;
  font-weight: 500;
  font-size: 13px;
}
.basis-content {
  color: #9fd4f2;
  font-size: 12px;
  line-height: 1.5;
  padding-left: 4px;
  border-left: 2px solid rgba(108, 192, 248, 0.3);
  margin-left: 2px;
}

.plan-summary-banner {
  background: rgba(22, 93, 255, 0.05);
  border: 1px solid rgba(108, 192, 248, 0.2);
  padding: 16px 24px;
  border-radius: 8px;
  margin-bottom: 24px;
}
.s-label {
  color: #8ec7e8;
  font-size: 14px;
  font-weight: 500;
}
.meta { color: #95cdef; margin-bottom: 10px; font-size: 13px; }

/* =========== 内容区统一样式 =========== */
.content-section {
  margin-bottom: 32px;
}

.ai-suggestion-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px dashed rgba(108, 192, 248, 0.3);
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.section-title {
  color: #5ad6ff;
  font-weight: 600;
  font-size: 16px;
}
.action-btns {
  display: flex;
  gap: 8px;
}

.content-wrapper {
  background: rgba(13, 35, 66, 0.4); 
  border: 1px solid rgba(90, 214, 255, 0.25);
  border-radius: 8px;
  padding: 24px;
}

.edit-area {
  background: #0d1624 !important;
  color: #d8f2ff !important;
  border: 1px solid rgba(0, 229, 255, 0.3) !important;
  font-family: monospace;
  font-size: 15px;
  border-radius: 6px;
}

.ai-empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px;
  background: rgba(13, 35, 66, 0.4);
  border-radius: 8px;
  border: 1px dashed rgba(95, 193, 255, 0.3);
}
.ai-hint { color: #8ec7e8; font-size: 13px; }

/* =========== 治理依据溯源区块 =========== */
.grounding-section {
  background: rgba(0, 180, 255, 0.05);
  border: 1px solid rgba(0, 180, 255, 0.2);
  border-radius: 8px;
  padding: 16px;
}
.section-header {
  color: #5ad6ff;
  font-weight: bold;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.info-block {
  background: rgba(13, 35, 66, 0.4);
  border: 1px solid rgba(90, 214, 255, 0.15);
  border-radius: 8px;
  padding: 20px;
  height: 100%;
}
.block-title {
  color: #e5f6ff;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

/* 风险画像分析 */
.context-item { margin-bottom: 16px; line-height: 1.6; }
.ctx-label { color: #8ec7e8; font-size: 13px; margin-bottom: 6px; }
.ctx-value {
  color: #ffffff;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.03);
  padding: 6px 10px;
  border-radius: 4px;
}

/* 法律依据 */
.basis-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.basis-name { color: #e5f6ff; font-weight: 600; font-size: 14px; }
.basis-content {
  color: #b0dff8;
  font-size: 13px;
  line-height: 1.6;
  padding-left: 10px;
  border-left: 2px solid rgba(108, 192, 248, 0.5);
  margin-left: 4px;
  margin-bottom: 16px;
}

/* ================= Markdown 美化（深色默认） ================= */
:deep(.markdown-body) {
  background-color: transparent !important;
  color: #dbf2ff !important;
  font-size: 16px;
  line-height: 1.8;
}

:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3) {
  color: #00e5ff !important;
  border-bottom: 1px dotted rgba(0, 229, 255, 0.2) !important;
  padding-bottom: 8px;
  margin-top: 24px;
}

:deep(.markdown-body strong),
:deep(.markdown-body b) {
  color: #00e5ff !important; 
  text-shadow: none !important; 
  font-weight: 800 !important;
}

:deep(.markdown-body blockquote) {
  background: rgba(0, 229, 255, 0.05) !important;
  border-left: 4px solid #00e5ff !important;
  padding: 12px 16px !important;
  color: #bfe9ff !important;
  margin: 16px 0 !important;
}

:deep(.markdown-body table tr) { background-color: transparent !important; }
:deep(.markdown-body table th) { background-color: rgba(0, 229, 255, 0.1) !important; color: #00e5ff; }
:deep(.markdown-body table td), 
:deep(.markdown-body table th) {
  border: 1px solid rgba(0, 229, 255, 0.2) !important;
}

:deep(.markdown-body ul) { list-style: none !important; padding-left: 10px !important; }
:deep(.markdown-body ul li::before) {
  content: "■";
  color: #00e5ff;
  font-size: 10px;
  margin-right: 12px;
}
:deep(.markdown-body ol) {
  list-style: none !important;
  padding-left: 10px !important;
  counter-reset: custom-counter; 
}
:deep(.markdown-body ol li) {
  counter-increment: custom-counter;
  margin-bottom: 8px;
}
:deep(.markdown-body ol li::before) {
  content: counter(custom-counter) "."; 
  color: #00e5ff;
  font-weight: bold;
  margin-right: 12px;
}

/* ================= 浅色模式颜色覆盖（只改颜色，不改字号） ================= */
:global(body.theme-light) .plan-page {
  /* 1. 页面主容器背景（无额外背景，透出全局浅色） */
  
  /* 2. 返回链接 */
  .back-legal {
    color: #165dff !important;
  }

  /* 3. 摘要横幅 */
  .plan-summary-banner {
    background: #f5f9ff !important;
    border-color: #b8d4f0 !important;
  }
  .s-label {
    color: #1e4f7a !important;
  }
  .meta {
    color: #3a6685 !important;
  }

  /* 4. 区块标题 */
  .section-title {
    color: #0a2f4d !important;
  }

  /* 5. 内容卡片 */
  .content-wrapper {
    background: #ffffff !important;
    border-color: #cce0ff !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  }

  /* 6. 编辑区：核心修复输入框及包裹层的深色背景 */
  .edit-area,
  :deep(.arco-textarea-wrapper),
  :deep(.arco-textarea) {
    background: #ffffff !important;
    background-color: #ffffff !important;
    color: #1d2129 !important;
    border-color: #a9c9ff !important;
  }

  /* 7. 治理依据区块 */
  .grounding-section {
    background: #f0f7ff !important;
    border-color: #b8d4f0 !important;
  }
  .section-header {
    color: #0a2f4d !important;
  }
  .info-block {
    background: #ffffff !important;
    border-color: #cce0ff !important;
  }
  .block-title {
    color: #0a2f4d !important;
  }

  /* 8. 风险画像文字 */
  .ctx-label {
    color: #1e4f7a !important;
  }
  .ctx-value {
    color: #1d2129 !important;
    background: #f7f9fc !important;
    border: 1px solid #d9e6f5 !important;
  }

  /* 9. 法律依据 */
  .basis-name {
    color: #0a2f4d !important;
  }
  .basis-content {
    color: #1e4f7a !important;
    border-left-color: #4688c0 !important;
  }

  /* 10. AI 空状态 */
  .ai-empty-box {
    background: #fafcff !important;
    border-color: #b8d4f0 !important;
  }
  .ai-hint {
    color: #1e4f7a !important;
  }

  /* 11. AI 提示条 */
  .ai-tip-bar {
    background: #fff7e8 !important;
    border-color: #ffcf8b !important;
    color: #b85e00 !important;
  }

  /* 12. Arco 按钮 (次级/文字按钮) */
  :deep(.arco-button:not(.arco-button-primary)) {
    background-color: #f2f3f5 !important;
    border-color: #c9cdd4 !important;
    color: #1d2129 !important;
  }
  :deep(.arco-button:not(.arco-button-primary):hover) {
    background-color: #e5e6eb !important;
    border-color: #86909c !important;
  }

  /* 13. 主按钮保持醒目 */
  :deep(.arco-button-primary) {
    background-color: #165dff !important;
    color: #ffffff !important;
  }

  /* 14. 标签 (Tag) 颜色调整 */
  :deep(.arco-tag) {
    color: #1d2129 !important;
    border-color: #c9cdd4 !important;
  }
  :deep(.arco-tag-blue) {
    background: #e8f3ff !important;
    border-color: #a9c9ff !important;
    color: #0a2f4d !important;
  }
  :deep(.arco-tag-orange) {
    background: #fff3e0 !important;
    border-color: #ffcf8b !important;
    color: #a64d00 !important;
  }
  :deep(.arco-tag-red) {
    background: #ffece8 !important;
    border-color: #ffb7a5 !important;
    color: #b02e0c !important;
  }

  /* 15. Markdown 内容完全适配浅色 */
  :deep(.markdown-body) {
    color: #1d2129 !important;
  }
  :deep(.markdown-body h1),
  :deep(.markdown-body h2),
  :deep(.markdown-body h3) {
    color: #0a2f4d !important;
    border-bottom-color: #cce0ff !important;
  }
  :deep(.markdown-body strong),
  :deep(.markdown-body b) {
    color: #0a2f4d !important;
  }
  :deep(.markdown-body blockquote) {
    background: #f0f7ff !important;
    border-left-color: #165dff !important;
    color: #1e4f7a !important;
  }
  :deep(.markdown-body table th) {
    background-color: #e8f3ff !important;
    color: #0a2f4d !important;
  }
  :deep(.markdown-body table td),
  :deep(.markdown-body table th) {
    border-color: #cce0ff !important;
  }
  :deep(.markdown-body ul li::before),
  :deep(.markdown-body ol li::before) {
    color: #165dff !important;
  }

  /* 16. PageHeader 标题 */
  :deep(.arco-page-header-title) {
    color: #0a2f4d !important;
  }
  :deep(.arco-page-header-sub-title) {
    color: #1e4f7a !important;
  }

  /* 17. Card 标题 */
  :deep(.arco-card-header-title) {
    color: #0a2f4d !important;
  }

  /* 18. 分割线 */
  .ai-suggestion-section {
    border-top-color: #cce0ff !important;
  }
}
</style>
