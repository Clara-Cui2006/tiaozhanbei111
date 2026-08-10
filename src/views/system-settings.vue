<template>
  <div class="settings-page">
    <BackHome />
    <a-page-header title="系统设置" subtitle="平台展示与数据口径配置">
      <template #extra><span class="settings-badge"><icon-lock /> 院内受控配置</span></template>
    </a-page-header>

    <div class="settings-summary" aria-label="配置范围">
      <span><strong>02</strong><small>配置字段</small></span>
      <span><strong>院内</strong><small>部署边界</small></span>
      <span><strong>受控</strong><small>修改方式</small></span>
    </div>

    <a-card :bordered="false" class="settings-card">
      <template #title><span class="settings-card-title"><icon-settings /> 平台基础配置</span></template>
      <template #extra>
        <span class="settings-card-extra" :class="{ 'is-error': loadFailed, 'is-busy': loading || saving }" aria-live="polite">
          <i aria-hidden="true"></i>{{ settingsStatus }}
        </span>
      </template>
      <a-form :model="form" layout="vertical" class="settings-form" :aria-busy="loading || saving">
        <section class="setting-section setting-section--cyan">
          <div class="setting-heading">
            <span class="setting-icon"><icon-apps /></span>
            <span><strong>平台标识</strong><small>配置平台统一展示名称</small></span>
          </div>
          <a-form-item field="name" label="平台名称">
            <a-input v-model="form.name" :disabled="loading || saving || loadFailed" placeholder="输入平台名称" />
          </a-form-item>
        </section>

        <section class="setting-section setting-section--gold">
          <div class="setting-heading">
            <span class="setting-icon"><icon-book /></span>
            <span><strong>数据口径</strong><small>配置全局数据范围提示</small></span>
          </div>
          <a-form-item field="dataScopeNotice" label="数据口径提示">
            <a-input v-model="form.dataScopeNotice" :disabled="loading || saving || loadFailed" placeholder="输入数据口径提示" />
          </a-form-item>
        </section>

        <div class="settings-actions">
          <span><icon-info-circle /> 设置项不包含模型、数据库或外网连接参数</span>
          <a-button v-if="loadFailed" type="outline" status="warning" @click="loadSettings">
            <template #icon><icon-refresh /></template>
            重新读取
          </a-button>
          <a-button v-else type="primary" :loading="saving" :disabled="loading" @click="save">
            <template #icon><icon-save /></template>
            保存设置
          </a-button>
        </div>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconApps, IconBook, IconInfoCircle, IconLock, IconRefresh, IconSave, IconSettings } from '@arco-design/web-vue/es/icon'
import BackHome from '../components/back-home.vue'
import { fetchSystemSettings, saveSystemSettings } from '../api/platform'
import type { SystemSettings } from '../types/platform'

const form = reactive<SystemSettings>({
  name: '',
  dataScopeNotice: ''
})
const loading = ref(true)
const saving = ref(false)
const loadFailed = ref(false)
const settingsStatus = computed(() => {
  if (loadFailed.value) return '配置读取失败'
  if (loading.value) return '正在读取配置'
  if (saving.value) return '正在保存配置'
  return '配置已就绪'
})

const save = async () => {
  if (loading.value || saving.value || loadFailed.value) return
  saving.value = true
  try {
    await saveSystemSettings(form)
    Message.success('系统设置已保存')
  } catch (error: any) {
    Message.error(error.response?.data?.detail || '系统设置保存失败')
  } finally {
    saving.value = false
  }
}

const loadSettings = async () => {
  loading.value = true
  loadFailed.value = false
  try {
    const settings = await fetchSystemSettings()
    form.name = settings.name
    form.dataScopeNotice = settings.dataScopeNotice
  } catch (error: any) {
    form.name = ''
    form.dataScopeNotice = ''
    loadFailed.value = true
    Message.error(error.response?.data?.detail || '系统设置读取失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadSettings)
</script>

<style scoped>
.settings-page {
  --settings-cyan: #64d8ff;
  --settings-gold: #f0ca70;
}

.settings-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  color: #c9efff;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid rgba(108, 208, 251, 0.4);
  border-radius: 6px;
  background: rgba(8, 35, 57, 0.5);
  box-shadow: inset 0 0 14px rgba(86, 198, 241, 0.08), 0 6px 16px rgba(0, 0, 0, 0.16);
}

.settings-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin-top: 16px;
  overflow: hidden;
  border: 1px solid rgba(104, 198, 237, 0.22);
  border-radius: 6px;
  background: rgba(103, 199, 239, 0.2);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.12);
}

.settings-summary > span {
  display: grid;
  min-height: 76px;
  place-content: center;
  gap: 2px;
  text-align: center;
  background: linear-gradient(180deg, rgba(14, 46, 68, 0.76), rgba(7, 27, 44, 0.76));
}

.settings-summary strong {
  color: var(--settings-cyan);
  font-size: 20px;
  line-height: 1.25;
  text-shadow: 0 0 13px rgba(100, 216, 255, 0.44);
}

.settings-summary > span:nth-child(2) strong { color: var(--settings-gold); }
.settings-summary > span:nth-child(3) strong { color: #62dfa9; }

.settings-summary small {
  color: #84acc1;
  font-size: 12px;
}

.settings-card {
  position: relative;
  max-width: 1040px;
  margin: 16px auto 0;
  overflow: hidden;
}

.settings-card::before {
  position: absolute;
  inset: 0 0 auto;
  z-index: 2;
  height: 2px;
  content: '';
  pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--settings-cyan), #edf2ef, var(--settings-gold), transparent);
  box-shadow: 0 0 14px rgba(100, 216, 255, 0.5);
}

.settings-card-title,
.settings-card-extra {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.settings-card-title svg { color: var(--settings-cyan); }

.settings-card-extra {
  color: #83aec2;
  font-size: 13px;
}

.settings-card-extra i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #62dfa9;
  box-shadow: 0 0 9px rgba(98, 223, 169, 0.72);
}

.settings-card-extra.is-busy i {
  background: var(--settings-gold);
  box-shadow: 0 0 9px rgba(240, 202, 112, 0.72);
  animation: settings-status-pulse 1.2s ease-in-out infinite;
}

.settings-card-extra.is-error { color: #ff9a90; }
.settings-card-extra.is-error i {
  background: #ff756c;
  box-shadow: 0 0 9px rgba(255, 117, 108, 0.72);
}

@keyframes settings-status-pulse {
  50% { opacity: 0.38; transform: scale(0.72); }
}

.settings-form {
  display: grid;
  gap: 14px;
}

.setting-section {
  --section-color: var(--settings-cyan);
  display: grid;
  grid-template-columns: minmax(220px, 0.42fr) minmax(320px, 1fr);
  align-items: center;
  gap: 24px;
  padding: 20px;
  border: 1px solid color-mix(in srgb, var(--section-color) 34%, transparent);
  border-radius: 6px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--section-color) 10%, transparent), transparent 48%),
    rgba(7, 27, 45, 0.44);
  box-shadow: inset 0 0 24px color-mix(in srgb, var(--section-color) 5%, transparent), 0 10px 20px rgba(0, 0, 0, 0.12);
}

.setting-section--gold { --section-color: var(--settings-gold); }

.setting-heading {
  display: flex;
  align-items: center;
  gap: 13px;
}

.setting-heading > span:last-child {
  display: grid;
  gap: 4px;
}

.setting-heading strong {
  color: #e7f5fb;
  font-size: 16px;
}

.setting-heading small {
  color: #83a9bc;
  font-size: 13px;
}

.setting-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--section-color);
  font-size: 21px;
  border: 1px solid color-mix(in srgb, var(--section-color) 52%, transparent);
  border-radius: 5px;
  background: color-mix(in srgb, var(--section-color) 10%, transparent);
  box-shadow: inset 0 0 13px color-mix(in srgb, var(--section-color) 9%, transparent), 0 0 13px color-mix(in srgb, var(--section-color) 10%, transparent);
}

.setting-section :deep(.arco-form-item) { margin-bottom: 0; }

.setting-section :deep(.arco-form-item-label-col > label) {
  color: #b9d9e8;
  font-size: 14px;
  font-weight: 600;
}

.setting-section :deep(.arco-input-wrapper) {
  min-height: 40px;
  border: 1px solid color-mix(in srgb, var(--section-color) 28%, transparent);
  border-radius: 4px;
  background: rgba(5, 23, 38, 0.62);
}

.setting-section :deep(.arco-input-wrapper:hover),
.setting-section :deep(.arco-input-wrapper.arco-input-focus) {
  border-color: var(--section-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--section-color) 10%, transparent);
}

.settings-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(105, 192, 230, 0.18);
}

.settings-actions > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #7fa8bc;
  font-size: 13px;
}

:global(body.theme-light) .settings-badge {
  color: #18506d;
  border-color: rgba(36, 118, 157, 0.34);
  background: rgba(215, 239, 249, 0.86);
}

:global(body.theme-light) .settings-summary > span {
  background: linear-gradient(180deg, rgba(228, 244, 251, 0.96), rgba(211, 235, 246, 0.92));
}

:global(body.theme-light) .settings-summary small,
:global(body.theme-light) .settings-card-extra,
:global(body.theme-light) .setting-heading small,
:global(body.theme-light) .settings-actions > span { color: #4b7085; }

:global(body.theme-light) .settings-summary strong { color: #176f93; text-shadow: none; }
:global(body.theme-light) .settings-summary > span:nth-child(2) strong { color: #97691d; }
:global(body.theme-light) .settings-summary > span:nth-child(3) strong { color: #277557; }

:global(body.theme-light) .setting-section {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--section-color) 16%, transparent), transparent 48%),
    rgba(230, 244, 251, 0.9);
  box-shadow: inset 0 0 18px color-mix(in srgb, var(--section-color) 7%, transparent), 0 8px 17px rgba(48, 89, 109, 0.1);
}

:global(body.theme-light) .setting-heading strong,
:global(body.theme-light) .setting-section :deep(.arco-form-item-label-col > label) { color: #173f58; }

:global(body.theme-light) .setting-section :deep(.arco-input-wrapper) {
  border-color: color-mix(in srgb, var(--section-color) 34%, transparent);
  background: rgba(241, 249, 253, 0.9);
}

@media (max-width: 760px) {
  .settings-badge { display: none; }
  .settings-card-extra { display: none; }

  .setting-section {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 14px;
  }

  .settings-actions {
    align-items: stretch;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-card-extra.is-busy i { animation: none; }
}
</style>
