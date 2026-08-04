<template>
  <a-button type="text" class="back-btn" @click="goHome">← 返回主页</a-button>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<style scoped>
.back-btn {
  padding-left: 0;
  color: #bfe9ff;
  font-weight: 600;
}

.back-btn:hover {
  color: #e9f8ff;
}
</style>
