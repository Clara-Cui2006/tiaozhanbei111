<template>
  <main class="login-page">
    <section class="login-card">
      <div class="emblem">法</div>
      <h1>西城区社区法治风险预警平台</h1>
      <p>检察内网部署版</p>
      <a-form :model="form" layout="vertical" @submit-success="submit">
        <a-form-item field="username" label="账号" :rules="[{ required: true, message: '请输入账号' }]">
          <a-input v-model="form.username" autocomplete="username" placeholder="请输入院内账号" />
        </a-form-item>
        <a-form-item field="password" label="密码" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model="form.password" autocomplete="current-password" placeholder="请输入密码" />
        </a-form-item>
        <a-alert v-if="errorMessage" type="error" class="error">{{ errorMessage }}</a-alert>
        <a-button html-type="submit" type="primary" long :loading="loading">登录</a-button>
      </a-form>
      <small>登录、查询、导入、AI调用等操作均会记录审计日志</small>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../services/auth'

const router = useRouter()
const form = reactive({ username: '', password: '' })
const loading = ref(false)
const errorMessage = ref('')

async function submit() {
  loading.value = true
  errorMessage.value = ''
  try {
    await login(form.username, form.password)
    await router.replace('/')
  } catch (error: any) {
    errorMessage.value = error.response?.data?.detail || '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: radial-gradient(circle at 25% 20%, #2b76b7 0, transparent 36%), linear-gradient(145deg, #071a32, #0d3b66); }
.login-card { width: min(420px, 100%); padding: 36px; border-radius: 16px; background: rgba(247, 252, 255, .97); box-shadow: 0 24px 70px rgba(0, 0, 0, .32); }
.emblem { width: 58px; height: 58px; display: grid; place-items: center; margin: 0 auto 18px; border-radius: 50%; background: #0b5b99; color: white; font: 700 26px serif; }
h1 { margin: 0; text-align: center; color: #123b60; font-size: 22px; }
p { margin: 8px 0 28px; text-align: center; color: #5c7890; }
.error { margin-bottom: 18px; }
small { display: block; margin-top: 20px; color: #6c8294; text-align: center; line-height: 1.6; }
</style>
