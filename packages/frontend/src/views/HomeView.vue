<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'

const message = ref('')

const testBackend = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/test')
    message.value = res.data.message
  } catch (error) {
    message.value = `连接后端失败${error}`
  }
}
</script>

<template>
  <div>
    <h1>图片记忆墙</h1>
    <button @click="testBackend">测试后端连接</button>
    <p>后端状态：{{ message }}</p>
  </div>
</template>
