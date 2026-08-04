<template>
  <div>
    <BackHome />
    <a-page-header title="账号权限与审计" subtitle="数据范围和功能权限分离授权" />
    <a-tabs style="margin-top:16px">
      <a-tab-pane key="users" title="账号权限">
        <a-card title="新建账号" :bordered="false">
          <a-form :model="form" layout="inline">
            <a-form-item label="账号"><a-input v-model="form.username" /></a-form-item>
            <a-form-item label="姓名"><a-input v-model="form.displayName" /></a-form-item>
            <a-form-item label="初始密码"><a-input-password v-model="form.password" /></a-form-item>
            <a-form-item label="角色"><a-select v-model="form.role" style="width:180px"><a-option v-for="item in roles" :key="item.value" :value="item.value">{{ item.label }}</a-option></a-select></a-form-item>
            <a-form-item label="业务条线"><a-input v-model="form.department" placeholder="如：刑事检察" /></a-form-item>
            <a-form-item label="专项授权">
              <a-checkbox-group v-model="form.permissions"><a-checkbox value="political:read">政治安全查看</a-checkbox><a-checkbox value="political:write">政治安全编辑</a-checkbox><a-checkbox value="ai:use">AI辅助</a-checkbox></a-checkbox-group>
            </a-form-item>
            <a-button type="primary" @click="createUser">创建</a-button>
          </a-form>
        </a-card>
        <a-table :data="users" style="margin-top:16px">
          <template #columns>
            <a-table-column title="账号" data-index="username" />
            <a-table-column title="姓名" data-index="displayName" />
            <a-table-column title="角色"><template #cell="{ record }">{{ roleName(record.role) }}</template></a-table-column>
            <a-table-column title="业务条线" data-index="department" />
            <a-table-column title="功能权限"><template #cell="{ record }">{{ record.permissions.join('、') }}</template></a-table-column>
          </template>
        </a-table>
      </a-tab-pane>
      <a-tab-pane key="audit" title="操作审计">
        <a-alert type="info" style="margin-bottom:12px">审计记录只保存操作类型、对象、结果和必要范围信息；模型输入仅保存摘要，不在日志中复制案件全文。</a-alert>
        <a-table :data="audits" :pagination="{ pageSize: 20 }">
          <template #columns>
            <a-table-column title="时间" data-index="created_at" />
            <a-table-column title="用户" data-index="username" />
            <a-table-column title="操作" data-index="action" />
            <a-table-column title="对象" data-index="resource_type" />
            <a-table-column title="对象编号" data-index="resource_id" />
            <a-table-column title="终端IP" data-index="client_ip" />
            <a-table-column title="结果"><template #cell="{ record }">{{ record.success ? '成功' : '失败' }}</template></a-table-column>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
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
