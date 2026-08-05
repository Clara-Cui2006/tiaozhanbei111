<template>
  <div>
    <BackHome />
    <a-page-header title="案件数据导入" subtitle="离线导入、校验、人工确认与批次回滚" />
    <a-alert type="warning" style="margin:16px 0">仅允许导入院内批准的数据文件。上传后先进入暂存校验区，人工确认前不参与任何统计。</a-alert>
    <a-card title="第一步：选择文件" :bordered="false">
      <input type="file" accept=".xlsx,.csv,.json" @change="selectFile" />
      <a-button type="primary" :disabled="!selectedFile" :loading="loading" style="margin-left:16px" @click="validateFile">上传并校验</a-button>
      <p class="hint">支持 XLSX、CSV、JSON，单文件不超过 20MB。必填字段：案件编号、案件名称、业务条线、案件类别。</p>
      <p class="hint">新增口径：法定罪名/案由与治理主题标签分层填写；街道归属只能为已确认街道、待确认地址、跨街道案件、与西城无地域关联。</p>
      <p class="hint">线索闭环字段支持：系统研判、人工复核、研判确认、内部移送、办理反馈、纳入统计；政治安全字段需经过人工复核后再纳入统计。</p>
    </a-card>
    <a-card v-if="batch" title="第二步：校验结果" :bordered="false" style="margin-top:16px">
      <a-descriptions :column="4" bordered>
        <a-descriptions-item label="批次号">{{ batch.batchId }}</a-descriptions-item>
        <a-descriptions-item label="总行数">{{ batch.totalRows }}</a-descriptions-item>
        <a-descriptions-item label="有效">{{ batch.validRows }}</a-descriptions-item>
        <a-descriptions-item label="错误">{{ batch.errorRows }}</a-descriptions-item>
      </a-descriptions>
      <a-table v-if="batch.errors.length" :data="batch.errors" :pagination="{ pageSize: 10 }" style="margin-top:16px">
        <template #columns>
          <a-table-column title="行" data-index="row" />
          <a-table-column title="字段" data-index="field" />
          <a-table-column title="问题" data-index="message" />
        </template>
      </a-table>
      <a-space style="margin-top:16px">
        <a-button type="primary" :disabled="batch.validRows === 0 || confirmed" @click="confirmBatch">人工确认入库</a-button>
        <a-button status="danger" :disabled="!confirmed || rolledBack" @click="rollbackBatch">回滚本批次</a-button>
      </a-space>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import BackHome from '../components/back-home.vue'
import { http } from '../api/http'

interface BatchResult { batchId: number; totalRows: number; validRows: number; errorRows: number; errors: Array<{ row: number; field: string; message: string }> }
const selectedFile = ref<File | null>(null)
const batch = ref<BatchResult | null>(null)
const loading = ref(false)
const confirmed = ref(false)
const rolledBack = ref(false)

function selectFile(event: Event) {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0] || null
  batch.value = null
  confirmed.value = false
  rolledBack.value = false
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
    Message.success(`已入库 ${data.inserted} 条，重复 ${data.duplicates} 条`)
  } })
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

<style scoped>.hint { color:#647b8e; margin:12px 0 0; }</style>
