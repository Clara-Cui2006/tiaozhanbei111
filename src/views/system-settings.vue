<template>
  <div>
    <BackHome />
    <a-page-header title="系统设置" subtitle="System Settings" />

    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="form" layout="vertical">
        <a-form-item field="name" label="平台名称">
          <a-input v-model="form.name" />
        </a-form-item>
        <a-form-item field="dataScopeNotice" label="数据口径提示">
          <a-input v-model="form.dataScopeNotice" />
        </a-form-item>
        <a-button type="primary" @click="save">保存设置</a-button>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import BackHome from '../components/back-home.vue'
import { fetchSystemSettings, saveSystemSettings } from '../api/platform'
import type { SystemSettings } from '../types/platform'

const form = reactive<SystemSettings>({
  name: '社区法治智能平台',
  dataScopeNotice: '仅展示已确认入库的数据'
})

const save = async () => {
  await saveSystemSettings(form)
  Message.success('系统设置已保存')
}

onMounted(async () => {
  const settings = await fetchSystemSettings()
  form.name = settings.name
  form.dataScopeNotice = settings.dataScopeNotice
})
</script>
