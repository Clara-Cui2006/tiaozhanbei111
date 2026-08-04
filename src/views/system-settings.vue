<template>
  <div>
    <BackHome />
    <a-page-header title="系统设置" subtitle="System Settings" />

    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="form" layout="vertical">
        <a-form-item field="name" label="平台名称">
          <a-input v-model="form.name" />
        </a-form-item>
        <a-form-item field="threshold" label="高风险预警阈值">
          <a-input-number v-model="form.threshold" :min="1" :max="100" />
        </a-form-item>
        <a-form-item field="sms" label="短信推送开关">
          <a-switch v-model="form.sms" />
        </a-form-item>
        <a-form-item field="wechat" label="微信推送开关">
          <a-switch v-model="form.wechat" />
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
  threshold: 80,
  sms: true,
  wechat: true
})

const save = async () => {
  await saveSystemSettings(form)
  Message.success('系统设置已保存')
}

onMounted(async () => {
  const settings = await fetchSystemSettings()
  form.name = settings.name
  form.threshold = settings.threshold
  form.sms = settings.sms
  form.wechat = settings.wechat
})
</script>