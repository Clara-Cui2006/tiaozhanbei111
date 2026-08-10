<template>
  <div class="access-page">
    <BackHome />
    <a-page-header title="账号权限与审计" subtitle="数据范围和功能权限分离授权">
      <template #extra>
        <span class="access-badge"><icon-safe /> 最小权限控制</span>
      </template>
    </a-page-header>

    <div class="access-overview" aria-label="权限管理概览">
      <div class="overview-item overview-item--cyan">
        <span>账号总数</span>
        <strong>{{ users.length }}</strong>
        <small>当前授权账号</small>
      </div>
      <div class="overview-item overview-item--gold">
        <span>全院范围</span>
        <strong>{{ fullScopeCount }}</strong>
        <small>部门主管与院领导</small>
      </div>
      <div class="overview-item overview-item--red">
        <span>政治安全授权</span>
        <strong>{{ politicalPermissionCount }}</strong>
        <small>独立专项权限</small>
      </div>
      <div class="overview-item overview-item--green">
        <span>审计记录</span>
        <strong>{{ audits.length }}</strong>
        <small>已加载操作记录</small>
      </div>
    </div>

    <div class="permission-boundary">
      <span><icon-user /> 普通用户仅查看所属业务条线</span>
      <span><icon-user-group /> 部门主管与院领导查看全院</span>
      <span><icon-safe /> 系统管理员不默认查看案件正文，政治安全独立授权</span>
    </div>

    <a-tabs class="access-tabs">
      <a-tab-pane key="users" title="账号权限">
        <a-card title="新建账号" :bordered="false" class="account-create-card">
          <template #extra><span class="form-scope-note"><icon-safe /> 角色与专项权限分离配置</span></template>
          <a-form :model="form" layout="vertical" class="account-form">
            <div class="account-form-grid">
              <a-form-item label="账号" class="form-field"><a-input v-model="form.username" placeholder="输入登录账号" /></a-form-item>
              <a-form-item label="姓名" class="form-field"><a-input v-model="form.displayName" placeholder="输入用户姓名" /></a-form-item>
              <a-form-item label="初始密码" class="form-field"><a-input-password v-model="form.password" placeholder="配置初始密码" /></a-form-item>
              <a-form-item label="角色" class="form-field"><a-select v-model="form.role"><a-option v-for="item in roles" :key="item.value" :value="item.value">{{ item.label }}</a-option></a-select></a-form-item>
              <a-form-item label="业务条线" class="form-field"><a-input v-model="form.department" placeholder="如：刑事检察" /></a-form-item>
              <a-form-item label="专项授权" class="form-field form-field--permissions">
                <a-checkbox-group v-model="form.permissions" class="permission-options">
                  <a-checkbox value="political:read">政治安全查看</a-checkbox>
                  <a-checkbox value="political:write">政治安全编辑</a-checkbox>
                  <a-checkbox value="ai:use">AI辅助</a-checkbox>
                </a-checkbox-group>
              </a-form-item>
            </div>
            <div class="account-form-actions">
              <span>未勾选的专项权限不会随角色自动授予</span>
              <a-button type="primary" @click="createUser">
                <template #icon><icon-user-add /></template>
                创建账号
              </a-button>
            </div>
          </a-form>
        </a-card>
        <a-card title="已授权账号" :bordered="false" class="directory-card directory-card--cyan">
          <template #extra><span class="directory-count">{{ users.length }} 个账号</span></template>
          <a-table :data="users" class="management-table user-table">
            <template #columns>
              <a-table-column title="账号" data-index="username" />
              <a-table-column title="姓名" data-index="displayName" />
              <a-table-column title="角色">
                <template #cell="{ record }"><a-tag :color="roleColor(record.role)">{{ roleName(record.role) }}</a-tag></template>
              </a-table-column>
              <a-table-column title="业务条线">
                <template #cell="{ record }"><span :class="{ 'empty-value': !record.department }">{{ record.department || '未配置' }}</span></template>
              </a-table-column>
              <a-table-column title="专项权限">
                <template #cell="{ record }">
                  <div v-if="record.permissions.length" class="permission-tags">
                    <a-tag v-for="permission in record.permissions" :key="permission" :color="permissionColor(permission)">{{ permissionName(permission) }}</a-tag>
                  </div>
                  <span v-else class="empty-value">无专项权限</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>
      <a-tab-pane key="audit" title="操作审计">
        <a-alert class="audit-alert" type="info">审计记录只保存操作类型、对象、结果和必要范围信息；模型输入仅保存摘要，不在日志中复制案件全文。</a-alert>
        <a-card title="审计记录" :bordered="false" class="directory-card directory-card--gold audit-card">
          <template #extra><span class="directory-count">{{ audits.length }} 条已加载</span></template>
          <a-table :data="audits" :pagination="{ pageSize: 20 }" class="management-table audit-table">
            <template #columns>
              <a-table-column title="时间" data-index="created_at" />
              <a-table-column title="用户" data-index="username" />
              <a-table-column title="操作" data-index="action" />
              <a-table-column title="对象" data-index="resource_type" />
              <a-table-column title="对象编号" data-index="resource_id" />
              <a-table-column title="终端IP" data-index="client_ip" />
              <a-table-column title="结果">
                <template #cell="{ record }"><a-tag :color="record.success ? 'green' : 'red'">{{ record.success ? '成功' : '失败' }}</a-tag></template>
              </a-table-column>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconSafe, IconUser, IconUserAdd, IconUserGroup } from '@arco-design/web-vue/es/icon'
import BackHome from '../components/back-home.vue'
import { http } from '../api/http'
import type { CurrentUser, UserRole } from '../services/auth'

const users = ref<CurrentUser[]>([])
const audits = ref<any[]>([])
const form = reactive({ username: '', displayName: '', password: '', role: 'ordinary' as UserRole, department: '', permissions: [] as string[] })
const roles = [
  { value: 'ordinary', label: '普通用户（所属条线）' }, { value: 'department_supervisor', label: '部门主任/主管（全院）' },
  { value: 'leadership', label: '院领导（全院决策）' }, { value: 'data_admin', label: '数据管理员' }, { value: 'system_admin', label: '系统管理员' }
]
const roleName = (value: string) => roles.find((item) => item.value === value)?.label || value
const roleColor = (value: string) => ({ ordinary: 'cyan', department_supervisor: 'green', leadership: 'gold', data_admin: 'orange', system_admin: 'red' }[value] || 'gray')
const permissionNames: Record<string, string> = { 'political:read': '政治安全查看', 'political:write': '政治安全编辑', 'ai:use': 'AI辅助' }
const permissionName = (value: string) => permissionNames[value] || value
const permissionColor = (value: string) => value.startsWith('political:') ? 'red' : value === 'ai:use' ? 'purple' : 'gray'
const fullScopeCount = computed(() => users.value.filter((item) => item.role === 'department_supervisor' || item.role === 'leadership').length)
const politicalPermissionCount = computed(() => users.value.filter((item) => item.permissions.some((permission) => permission.startsWith('political:'))).length)

async function load() {
  const [userResult, auditResult] = await Promise.all([http.get('/users'), http.get('/audit-logs')])
  users.value = userResult.data
  audits.value = auditResult.data
}
async function createUser() {
  try {
    await http.post('/users', { ...form, department: form.department || null })
    Message.success('账号已创建')
    Object.assign(form, { username: '', displayName: '', password: '', role: 'ordinary', department: '', permissions: [] })
    await load()
  } catch (error: any) { Message.error(error.response?.data?.detail || '创建失败') }
}
onMounted(load)
</script>

<style scoped>
.access-page {
  --access-cyan: #64d8ff;
  --access-gold: #f0c96d;
  --access-red: #ff756c;
  --access-green: #61e0a9;
}

.access-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  color: #c9efff;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid rgba(111, 211, 255, 0.4);
  border-radius: 6px;
  background: rgba(8, 36, 58, 0.5);
  box-shadow: inset 0 0 14px rgba(90, 201, 244, 0.08), 0 6px 16px rgba(0, 0, 0, 0.16);
}

.access-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.overview-item {
  --overview-color: var(--access-cyan);
  position: relative;
  display: grid;
  min-height: 116px;
  align-content: center;
  gap: 3px;
  padding: 14px 17px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--overview-color) 42%, transparent);
  border-radius: 6px;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--overview-color) 13%, transparent), transparent 54%),
    rgba(7, 27, 45, 0.55);
  box-shadow: inset 0 0 26px color-mix(in srgb, var(--overview-color) 7%, transparent), 0 12px 24px rgba(0, 0, 0, 0.15);
}

.overview-item::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 2px;
  content: '';
  background: linear-gradient(180deg, transparent, var(--overview-color), transparent);
  box-shadow: 0 0 13px var(--overview-color);
}

.overview-item--gold { --overview-color: var(--access-gold); }
.overview-item--red { --overview-color: var(--access-red); }
.overview-item--green { --overview-color: var(--access-green); }

.overview-item span,
.overview-item small {
  color: #8eb5c9;
  font-size: 13px;
}

.overview-item strong {
  color: var(--overview-color);
  font-size: 29px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 15px color-mix(in srgb, var(--overview-color) 48%, transparent);
}

.permission-boundary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
  margin-top: 14px;
  padding: 11px 14px;
  color: #a9cde0;
  font-size: 13px;
  line-height: 1.55;
  border: 1px solid rgba(105, 196, 235, 0.2);
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(16, 62, 87, 0.34), rgba(9, 29, 45, 0.2));
}

.permission-boundary span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.permission-boundary svg { color: var(--access-gold); }

.access-tabs { margin-top: 16px; }

.access-tabs :deep(.arco-tabs-tab-title) {
  font-size: 16px;
  font-weight: 600;
}

.access-tabs :deep(.arco-tabs-nav-ink) {
  height: 3px;
  background: linear-gradient(90deg, var(--access-cyan), #e6edf0, var(--access-gold));
  box-shadow: 0 0 10px rgba(100, 216, 255, 0.5);
}

.account-create-card {
  position: relative;
  overflow: hidden;
}

.account-create-card::before {
  position: absolute;
  inset: 0 0 auto;
  z-index: 1;
  height: 2px;
  content: '';
  pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--access-gold), #eff5f3, var(--access-cyan), transparent);
  box-shadow: 0 0 14px rgba(240, 201, 109, 0.52);
}

.form-scope-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #a9cede;
  font-size: 13px;
}

.account-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 2px 16px;
}

.form-field { min-width: 0; }
.form-field--permissions { grid-column: span 2; }

.account-form :deep(.arco-form-item-label-col > label) {
  color: #bddceb;
  font-size: 14px;
  font-weight: 600;
}

.account-form :deep(.arco-input-wrapper),
.account-form :deep(.arco-select-view-single) {
  min-height: 38px;
  border: 1px solid rgba(100, 199, 239, 0.24);
  border-radius: 4px;
  background: rgba(7, 29, 46, 0.52);
  box-shadow: inset 0 0 14px rgba(70, 180, 220, 0.04);
}

.account-form :deep(.arco-input-wrapper:hover),
.account-form :deep(.arco-select-view-single:hover) {
  border-color: rgba(100, 216, 255, 0.58);
}

.account-form :deep(.arco-input-wrapper.arco-input-focus),
.account-form :deep(.arco-select-view-single.arco-select-view-focus) {
  border-color: var(--access-cyan);
  box-shadow: 0 0 0 2px rgba(100, 216, 255, 0.12), inset 0 0 14px rgba(70, 180, 220, 0.07);
}

.permission-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(130px, 1fr));
  width: 100%;
  min-height: 38px;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border: 1px solid rgba(240, 201, 109, 0.24);
  border-radius: 4px;
  background: rgba(77, 58, 17, 0.14);
}

.permission-options :deep(.arco-checkbox) {
  margin-right: 0;
}

.account-form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(103, 190, 229, 0.16);
}

.account-form-actions span {
  color: #7fa9bf;
  font-size: 13px;
}

.directory-card {
  position: relative;
  margin-top: 16px;
  overflow: hidden;
}

.directory-card::before {
  position: absolute;
  inset: 0 0 auto;
  z-index: 2;
  height: 2px;
  content: '';
  pointer-events: none;
}

.directory-card--cyan::before {
  background: linear-gradient(90deg, transparent, var(--access-cyan), #e6eff2, var(--access-cyan), transparent);
  box-shadow: 0 0 13px rgba(100, 216, 255, 0.58);
}

.directory-card--gold::before {
  background: linear-gradient(90deg, transparent, var(--access-gold), #f1f3ee, var(--access-gold), transparent);
  box-shadow: 0 0 13px rgba(240, 201, 109, 0.54);
}

.directory-count {
  color: #8eb9ce;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.management-table :deep(.arco-table-th) {
  background: rgba(14, 48, 71, 0.78);
}

.management-table :deep(.arco-table-th-item) {
  color: #d7eff9;
  font-size: 14px;
  font-weight: 700;
}

.management-table :deep(.arco-table-td) {
  border-color: rgba(100, 193, 232, 0.16);
  background: rgba(7, 26, 43, 0.44);
}

.management-table :deep(.arco-table-tr:hover .arco-table-td) {
  background: rgba(28, 77, 103, 0.46);
}

.permission-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.empty-value {
  color: #7599ad;
  font-size: 13px;
}

.audit-alert {
  margin-bottom: 12px;
  border: 1px solid rgba(91, 186, 229, 0.3);
  background: linear-gradient(90deg, rgba(17, 64, 89, 0.38), rgba(9, 29, 45, 0.22));
  box-shadow: inset 3px 0 0 var(--access-cyan);
}

.audit-card { margin-top: 0; }

.audit-table :deep(.arco-table-td:first-child) {
  color: #99cce2;
  font-variant-numeric: tabular-nums;
}

:global(body.theme-light) .access-badge {
  color: #18506e;
  border-color: rgba(37, 120, 158, 0.34);
  background: rgba(214, 238, 249, 0.86);
}

:global(body.theme-light) .overview-item {
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--overview-color) 19%, transparent), transparent 56%),
    rgba(229, 244, 251, 0.92);
  box-shadow: inset 0 0 20px color-mix(in srgb, var(--overview-color) 8%, transparent), 0 9px 18px rgba(46, 89, 111, 0.12);
}

:global(body.theme-light) .overview-item span,
:global(body.theme-light) .overview-item small { color: #4d7388; }

:global(body.theme-light) .overview-item strong {
  color: color-mix(in srgb, var(--overview-color) 72%, #163e56);
  text-shadow: none;
}

:global(body.theme-light) .permission-boundary {
  color: #315f79;
  border-color: rgba(38, 112, 148, 0.24);
  background: rgba(214, 237, 248, 0.72);
}

:global(body.theme-light) .form-scope-note,
:global(body.theme-light) .account-form :deep(.arco-form-item-label-col > label),
:global(body.theme-light) .account-form-actions span { color: #315e76; }

:global(body.theme-light) .account-form :deep(.arco-input-wrapper),
:global(body.theme-light) .account-form :deep(.arco-select-view-single) {
  border-color: rgba(38, 116, 151, 0.25);
  background: rgba(226, 242, 250, 0.88);
}

:global(body.theme-light) .permission-options {
  border-color: rgba(173, 126, 34, 0.3);
  background: rgba(242, 230, 192, 0.35);
}

:global(body.theme-light) .directory-count,
:global(body.theme-light) .empty-value { color: #476f86; }

:global(body.theme-light) .management-table :deep(.arco-table-th) {
  background: rgba(165, 207, 229, 0.82);
}

:global(body.theme-light) .management-table :deep(.arco-table-th-item) { color: #153f59; }

:global(body.theme-light) .management-table :deep(.arco-table-td) {
  border-color: rgba(40, 110, 144, 0.18);
  background: rgba(230, 244, 251, 0.84);
}

:global(body.theme-light) .management-table :deep(.arco-table-tr:hover .arco-table-td) {
  background: rgba(205, 232, 245, 0.92);
}

:global(body.theme-light) .audit-alert {
  border-color: rgba(43, 123, 160, 0.3);
  background: rgba(217, 239, 249, 0.82);
}

@media (max-width: 900px) {
  .access-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .access-badge { display: none; }
  .account-form-grid { grid-template-columns: repeat(2, minmax(160px, 1fr)); }
  .form-field--permissions { grid-column: 1 / -1; }
}

@media (max-width: 480px) {
  .overview-item {
    min-height: 88px;
    padding: 10px 12px;
  }

  .overview-item strong { font-size: 23px; }
  .permission-boundary { gap: 8px; }

  .account-form-grid { grid-template-columns: 1fr; }
  .form-field--permissions { grid-column: auto; }
  .permission-options { grid-template-columns: 1fr; }

  .account-form-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
