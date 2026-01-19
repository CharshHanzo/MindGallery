<script setup lang="ts">
</script>

<template>
  <div>
    <router-view />
  </div>
</template>

<style lang="scss" scoped>
.common-layout {
  height: 100vh;
  
  // 使用 SCSS 变量和嵌套
  background: var(--color-background);
  
  .app-content {
    padding: 1rem;
    
    @media (min-width: 768px) {
      padding: 2rem;
    }
  }
}
</style>
