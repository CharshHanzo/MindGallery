<template>
  <div class="all-gallery-view">
    <div class="gallery-container">
      <el-card style="max-width: 480px">
        <template #header>Yummy hamburger</template>
        <img
          src="https://shadow.elemecdn.com/app/element/hamburger.9cf7b091-55e9-11e9-a976-7f4d0b07eef6.png"
          style="width: 100%"
        />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
// import type { ImageData } from '@mindgallery/shared';
</script>

<style scoped>
.all-gallery-view {
  padding: 2rem;
}
.gallery-container {
  display: flex;

}
</style>
