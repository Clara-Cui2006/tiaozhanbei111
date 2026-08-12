<template>
  <div class="data-management-page">
    <BackHome />
    <a-page-header title="案件数据导入" subtitle="离线导入、校验、人工确认与批次回滚">
      <template #extra>
        <span class="security-badge"><icon-safe /> 院内离线通道</span>
      </template>
    </a-page-header>

    <div class="workflow-strip" aria-label="数据导入流程">
      <div class="workflow-step workflow-step--cyan" :class="{ 'is-active': !batch }">
        <span class="step-index">01</span>
        <span><strong>文件暂存</strong><small>选择业务系统导出表</small></span>
      </div>
      <span class="workflow-line" aria-hidden="true"></span>
      <div class="workflow-step workflow-step--gold" :class="{ 'is-active': batch && !confirmed }">
        <span class="step-index">02</span>
        <span><strong>规则校验</strong><small>自动识别多表字段</small></span>
      </div>
      <span class="workflow-line" aria-hidden="true"></span>
      <div class="workflow-step workflow-step--green" :class="{ 'is-active': confirmed && !rolledBack }">
        <span class="step-index">03</span>
        <span><strong>人工确认</strong><small>确认后进入业务库</small></span>
      </div>
    </div>

    <a-alert class="security-alert" type="warning">仅允许导入院内批准的数据文件。当前支持业务系统宽表与政治安全特殊案件简表，上传后先进入暂存校验区，人工确认前不参与任何统计。</a-alert>

    <a-card title="第一步：选择文件" :bordered="false" class="operation-card operation-card--cyan">
      <div class="upload-workbench">
        <div class="upload-icon" aria-hidden="true"><icon-upload /></div>
        <div class="upload-copy">
          <strong>{{ selectedFile?.name || '尚未选择数据文件' }}</strong>
          <span>{{ selectedFile ? '文件已进入本地暂存，等待规则校验' : '支持业务系统 XLSX 宽表，也支持政治安全特殊案件表头，单文件不超过 20MB' }}</span>
        </div>
        <div class="upload-actions">
          <label class="file-select-button" for="case-data-file"><icon-file /> {{ selectedFile ? '重新选择' : '选择文件' }}</label>
          <input id="case-data-file" class="visually-hidden" type="file" accept=".xlsx,.csv,.json" @change="selectFile" />
          <a-button type="primary" :disabled="!selectedFile" :loading="loading" @click="validateFile">
            <template #icon><icon-check-circle /></template>
            上传并校验
          </a-button>
        </div>
      </div>
      <div class="rule-list">
        <p class="hint"><span>01</span>业务系统宽表核心字段取部门受案号、案件名称、承办部门、案件类别；政治安全特殊案件简表可使用序号、案件名称、姓名、性别、特殊身份、涉案地点、是否西城户籍、移送时间、案由、简要案情。</p>
        <p class="hint"><span>02</span>政治安全特殊案件简表会自动生成内部案件编号，默认业务条线为政治安全专项、案件类别为政治安全特殊案件，并进入待人工复核口径。</p>
        <p class="hint"><span>03</span>地址字段自动识别西城街道；案由映射为行为内容，特殊身份映射为涉及主体/重点专题，简要案情进入案件摘要。</p>
      </div>
    </a-card>
    <a-card v-if="batch" title="第二步：校验结果" :bordered="false" class="operation-card operation-card--gold result-card">
      <template #extra>
        <span class="batch-state" :class="{ 'is-confirmed': confirmed && !rolledBack, 'is-rollback': rolledBack }" aria-live="polite">
          <icon-history v-if="rolledBack" />
          <icon-check-circle v-else />
          {{ rolledBack ? '批次已回滚' : confirmed ? appliedModeLabel : '等待人工确认' }}
        </span>
      </template>

      <div class="result-metrics">
        <div class="result-metric result-metric--cyan">
          <span>批次号</span>
          <strong>{{ batch.batchId }}</strong>
          <small>暂存批次</small>
        </div>
        <div class="result-metric result-metric--gold">
          <span>总行数</span>
          <strong>{{ batch.totalRows }}</strong>
          <small>本次读取</small>
        </div>
        <div class="result-metric result-metric--green">
          <span>有效数据</span>
          <strong>{{ batch.validRows }}</strong>
          <small>可确认入库</small>
        </div>
        <div class="result-metric result-metric--red">
          <span>错误数据</span>
          <strong>{{ batch.errorRows }}</strong>
          <small>需修正后重传</small>
        </div>
      </div>

      <a-table v-if="batch.errors.length" class="error-table" :data="batch.errors" :pagination="{ pageSize: 10 }">
        <template #columns>
          <a-table-column title="行" data-index="row" />
          <a-table-column title="字段" data-index="field" />
          <a-table-column title="问题" data-index="message" />
        </template>
      </a-table>
      <div class="result-actions">
        <a-button type="primary" :disabled="batch.validRows === 0 || confirmed" @click="confirmBatch">
          <template #icon><icon-check /></template>
          追加入库
        </a-button>
        <a-button status="danger" :disabled="batch.validRows === 0 || confirmed" @click="replaceBatch">
          <template #icon><icon-check-circle /></template>
          全量替换入库
        </a-button>
        <a-button status="danger" :disabled="!confirmed || rolledBack || appliedMode === 'replace'" @click="rollbackBatch">
          <template #icon><icon-history /></template>
          回滚本批次
        </a-button>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { IconCheck, IconCheckCircle, IconFile, IconHistory, IconSafe, IconUpload } from '@arco-design/web-vue/es/icon'
import BackHome from '../components/back-home.vue'
import { http } from '../api/http'

interface BatchResult { batchId: number; totalRows: number; validRows: number; errorRows: number; errors: Array<{ row: number; field: string; message: string }> }
const selectedFile = ref<File | null>(null)
const batch = ref<BatchResult | null>(null)
const loading = ref(false)
const confirmed = ref(false)
const rolledBack = ref(false)
const appliedMode = ref<'append' | 'replace' | null>(null)
const appliedModeLabel = computed(() => appliedMode.value === 'replace' ? '已全量替换入库' : '已追加入库')

function selectFile(event: Event) {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0] || null
  batch.value = null
  confirmed.value = false
  rolledBack.value = false
  appliedMode.value = null
}

async function validateFile() {
  if (!selectedFile.value) return
  loading.value = true
  const form = new FormData()
  form.append('file', selectedFile.value)
  try {
    const { data } = await http.post<BatchResult>('/data/import/validate', form)
    batch.value = data
    Message.success('校验完成，请核对结果后再确认入库')
  } catch (error: any) {
    Message.error(error.response?.data?.detail || '文件校验失败')
  } finally { loading.value = false }
}

function confirmBatch() {
  if (!batch.value) return
  Modal.confirm({ title: '确认入库', content: '确认后，有效数据将进入正式业务库并参与权限范围内的统计。', onOk: async () => {
    const { data } = await http.post(`/data/import/${batch.value!.batchId}/confirm`)
    confirmed.value = true
    appliedMode.value = 'append'
    Message.success(`已入库 ${data.inserted} 条，重复 ${data.duplicates} 条`)
  } })
}

function replaceBatch() {
  if (!batch.value) return
  Modal.confirm({
    title: '全量替换入库',
    content: '此操作会先清空当前案件库，再写入本次校验通过的数据。适用于用一整张最新 Excel 替换旧数据，请确认已选对文件。',
    okText: '确认替换',
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      const { data } = await http.post(`/data/import/${batch.value!.batchId}/replace`)
      confirmed.value = true
      appliedMode.value = 'replace'
      Message.success(`已删除旧数据 ${data.deleted} 条，写入新数据 ${data.inserted} 条`)
    }
  })
}

function rollbackBatch() {
  if (!batch.value) return
  Modal.confirm({ title: '回滚批次', content: '将删除该批次写入的全部案件记录。操作会写入审计日志。', onOk: async () => {
    const { data } = await http.post(`/data/import/${batch.value!.batchId}/rollback`)
    rolledBack.value = true
    Message.success(`已回滚并删除 ${data.deleted} 条记录`)
  } })
}
</script>

<style scoped>
.data-management-page {
  --cyan: #62d9ff;
  --gold: #f1cb78;
  --green: #62e0aa;
}

.security-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  color: #c8edff;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid rgba(112, 210, 255, 0.38);
  border-radius: 6px;
  background: rgba(8, 35, 59, 0.5);
  box-shadow: inset 0 0 14px rgba(68, 188, 235, 0.08), 0 5px 14px rgba(0, 0, 0, 0.18);
}

.workflow-strip {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 56px minmax(180px, 1fr) 56px minmax(180px, 1fr);
  align-items: center;
  margin: 16px 0;
  padding: 10px 14px;
  border-block: 1px solid rgba(116, 202, 247, 0.18);
  background: linear-gradient(90deg, rgba(18, 54, 80, 0.15), rgba(21, 45, 65, 0.48), rgba(18, 54, 80, 0.15));
}

.workflow-step {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 8px 10px;
  opacity: 0.66;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.workflow-step.is-active {
  opacity: 1;
  transform: translateY(-2px);
}

.workflow-step > span:last-child {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.workflow-step strong {
  color: #e9f7ff;
  font-size: 15px;
}

.workflow-step small {
  overflow: hidden;
  color: #83aeca;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-index {
  font-size: 20px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 14px currentColor;
}

.workflow-step--cyan .step-index { color: var(--cyan); }
.workflow-step--gold .step-index { color: var(--gold); }
.workflow-step--green .step-index { color: var(--green); }

.workflow-line {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(210, 232, 239, 0.64), transparent);
  box-shadow: 0 0 8px rgba(117, 208, 246, 0.35);
}

.security-alert {
  margin-bottom: 16px;
  border: 1px solid rgba(236, 177, 77, 0.42);
  background: linear-gradient(90deg, rgba(115, 72, 13, 0.25), rgba(47, 43, 30, 0.22));
  box-shadow: inset 3px 0 0 #dda746, 0 8px 22px rgba(0, 0, 0, 0.12);
}

.operation-card {
  position: relative;
  overflow: hidden;
}

.operation-card::before {
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  content: '';
  pointer-events: none;
}

.operation-card--cyan::before {
  background: linear-gradient(90deg, transparent, var(--cyan), #dbeef4, var(--cyan), transparent);
  box-shadow: 0 0 14px rgba(98, 217, 255, 0.72);
}

.operation-card--gold::before {
  background: linear-gradient(90deg, transparent, var(--gold), #f2f5ef, var(--gold), transparent);
  box-shadow: 0 0 14px rgba(241, 203, 120, 0.64);
}

.upload-workbench {
  display: grid;
  grid-template-columns: 54px minmax(220px, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(110, 207, 249, 0.3);
  border-radius: 6px;
  background:
    linear-gradient(135deg, rgba(43, 128, 173, 0.16), transparent 42%),
    rgba(5, 24, 42, 0.34);
  box-shadow: inset 0 0 28px rgba(53, 170, 220, 0.08), 0 12px 28px rgba(0, 0, 0, 0.14);
}

.upload-icon {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  color: var(--cyan);
  font-size: 26px;
  border: 1px solid rgba(117, 218, 255, 0.55);
  border-radius: 6px;
  background: linear-gradient(145deg, rgba(53, 153, 199, 0.26), rgba(8, 35, 55, 0.72));
  box-shadow: inset 0 0 16px rgba(92, 207, 250, 0.13), 0 0 18px rgba(72, 191, 235, 0.13);
}

.upload-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.upload-copy strong {
  overflow: hidden;
  color: #e8f7ff;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-copy span {
  color: #8eb7cc;
  font-size: 13px;
}

.upload-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-select-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 14px;
  color: #d9f4ff;
  font-size: 14px;
  line-height: 30px;
  cursor: pointer;
  border: 1px solid rgba(113, 211, 250, 0.48);
  border-radius: 4px;
  background: rgba(24, 84, 112, 0.42);
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.file-select-button:hover {
  border-color: var(--cyan);
  background: rgba(32, 112, 148, 0.56);
  transform: translateY(-1px);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.rule-list {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.hint {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: baseline;
  gap: 10px;
  margin: 0;
  color: #91b3c8;
  font-size: 13px;
  line-height: 1.65;
}

.hint span {
  color: var(--gold);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.result-card { margin-top: 16px; }

.batch-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  color: #f1cb78;
  font-size: 13px;
  border: 1px solid rgba(241, 203, 120, 0.4);
  border-radius: 4px;
  background: rgba(112, 75, 15, 0.22);
}

.batch-state.is-confirmed {
  color: var(--green);
  border-color: rgba(98, 224, 170, 0.42);
  background: rgba(25, 107, 78, 0.2);
}

.batch-state.is-rollback {
  color: #ff8d81;
  border-color: rgba(255, 116, 101, 0.42);
  background: rgba(128, 45, 38, 0.2);
}

.result-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.result-metric {
  position: relative;
  display: grid;
  min-height: 118px;
  align-content: center;
  gap: 3px;
  padding: 14px 16px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--metric-color) 42%, transparent);
  border-radius: 6px;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--metric-color) 14%, transparent), transparent 52%),
    rgba(6, 26, 44, 0.48);
  box-shadow:
    inset 0 0 24px color-mix(in srgb, var(--metric-color) 7%, transparent),
    0 12px 20px rgba(0, 0, 0, 0.15);
}

.result-metric::after {
  position: absolute;
  inset: 10px 8px 10px auto;
  width: 2px;
  content: '';
  background: linear-gradient(180deg, transparent, var(--metric-color), transparent);
  box-shadow: 0 0 12px var(--metric-color);
  opacity: 0.68;
}

.result-metric--cyan { --metric-color: #61d7ff; }
.result-metric--gold { --metric-color: #f2c86f; }
.result-metric--green { --metric-color: #59dfa7; }
.result-metric--red { --metric-color: #ff756b; }

.result-metric span,
.result-metric small {
  color: #88acc1;
  font-size: 13px;
}

.result-metric strong {
  color: var(--metric-color);
  font-size: 28px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 16px color-mix(in srgb, var(--metric-color) 48%, transparent);
}

.error-table { margin-top: 16px; }

.error-table :deep(.arco-table-th) {
  background: rgba(87, 46, 32, 0.4);
}

.error-table :deep(.arco-table-td:first-child) {
  color: #ff9b8d;
  font-weight: 700;
}

.result-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(132, 192, 219, 0.18);
}

:global(body.theme-light) .security-badge {
  color: #185173;
  border-color: rgba(35, 118, 160, 0.34);
  background: rgba(218, 240, 251, 0.86);
}

:global(body.theme-light) .workflow-strip {
  border-color: rgba(37, 105, 145, 0.22);
  background: linear-gradient(90deg, transparent, rgba(190, 220, 237, 0.5), transparent);
}

:global(body.theme-light) .workflow-step strong,
:global(body.theme-light) .upload-copy strong { color: #123f5d; }

:global(body.theme-light) .workflow-step small,
:global(body.theme-light) .upload-copy span,
:global(body.theme-light) .hint { color: #4c748b; }

:global(body.theme-light) .upload-workbench {
  border-color: rgba(47, 129, 168, 0.32);
  background: linear-gradient(135deg, rgba(86, 174, 212, 0.2), rgba(232, 246, 253, 0.78));
}

:global(body.theme-light) .file-select-button {
  color: #174e6c;
  border-color: rgba(30, 118, 157, 0.42);
  background: rgba(196, 228, 242, 0.8);
}

:global(body.theme-light) .result-metric {
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--metric-color) 20%, transparent), transparent 54%),
    rgba(226, 242, 250, 0.86);
  box-shadow: inset 0 0 20px color-mix(in srgb, var(--metric-color) 9%, transparent), 0 9px 18px rgba(43, 85, 106, 0.12);
}

:global(body.theme-light) .result-metric span,
:global(body.theme-light) .result-metric small { color: #4a7188; }

:global(body.theme-light) .result-metric strong {
  color: color-mix(in srgb, var(--metric-color) 72%, #163f58);
  text-shadow: none;
}

@media (max-width: 820px) {
  .workflow-strip {
    grid-template-columns: 1fr;
    gap: 3px;
    padding: 8px;
  }

  .workflow-line { display: none; }
  .workflow-step { padding: 6px 8px; }
  .workflow-step small { white-space: normal; }

  .upload-workbench {
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 10px;
    padding: 12px;
  }

  .upload-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .upload-actions {
    grid-column: 1 / -1;
    flex-wrap: wrap;
  }

  .upload-copy strong { font-size: 14px; }
  .security-badge { display: none; }

  .result-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }

  .result-metric {
    min-height: 92px;
    padding: 10px 12px;
  }

  .result-metric strong { font-size: 22px; }

  .result-actions {
    flex-wrap: wrap;
    margin-top: 10px;
    padding-top: 10px;
  }
}

@media (max-width: 460px) {
  .result-metrics { grid-template-columns: 1fr; }
  .batch-state { display: none; }
}
</style>
