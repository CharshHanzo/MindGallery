<script setup lang="ts">
import { ref, provide } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 共享 UI 状态
const searchQuery = ref('')
const selectionMode = ref(false)

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑将由子组件处理
  // 这里可以通过事件或状态管理传递搜索参数
  console.log('搜索:', searchQuery.value)
}

// 切换选择模式
const toggleSelectionMode = () => {
  selectionMode.value = !selectionMode.value
  // 选择模式状态将由子组件处理
  console.log('选择模式:', selectionMode.value)
}

// 提供共享状态给子组件
provide('searchState', {
  searchQuery,
  handleSearch,
  selectionMode,
  toggleSelectionMode
})
</script>

<template>
  <div class="moments-view">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-header">Photos</div>
      <nav class="nav-group">
        <router-link to="/allGallery" class="nav-item" active-class="active">
          <el-icon><House /></el-icon>
          <span>所有照片</span>
        </router-link>
        <a href="#" class="nav-item">
          <el-icon><Clock /></el-icon>
          <span>最近添加</span>
        </a>
        <router-link to="/favorites" class="nav-item" active-class="active">
          <el-icon><Star /></el-icon>
          <span>个人收藏</span>
        </router-link>
      </nav>
      <div class="sidebar-header" style="margin-top: 30px">Library</div>
      <nav class="nav-group">
        <router-link to="/myAlbums" class="nav-item" active-class="active">
          <el-icon><Collection /></el-icon>
          <span>相册</span>
        </router-link>
        <router-link to="/memoryMap" class="nav-item" active-class="active">
          <el-icon><Location /></el-icon>
          <span>地点</span>
        </router-link>
        <a href="#" class="nav-item">
          <el-icon><UserFilled /></el-icon>
          <span>人物</span>
        </a>
      </nav>
    </aside>

    <!-- 主内容区 -->
    <main>
      <!-- 动态内容区 -->
      <div class="moments-content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style lang="scss" scoped>
:root {
  --sidebar-bg: rgb(246, 246, 246);
  --main-bg: #ffffff;
  --accent-blue: #007aff;
  --accent-red: #ff3b30;
  --text-primary: #1d1d1f;
  --text-secondary: #86868b;
  --border-color: rgba(0, 0, 0, 0.1);
}

.moments-view {
  height: 100vh;
  background: var(--main-bg);
  display: flex;
  overflow: hidden;
  position: relative;

  // 侧边栏
  .sidebar {
    width: 260px;
    background-color: rgb(246, 246, 246);
    backdrop-filter: blur(30px) saturate(180%);
    border-right: 0.5px solid var(--border-color);
    display: flex;
    flex-direction: column;
    padding: 20px 16px 20px;
    z-index: 10;
    flex-shrink: 0;
    overflow-y: auto;

    .sidebar-header {
      padding-left: 12px;
      margin-bottom: 20px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: -0.01em;
    }

    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          text-decoration: none;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;

          el-icon {
            width: 20px;
            color: var(--accent-blue);
            font-size: 16px;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          &:hover {
            background-color: rgba(0, 0, 0, 0.05);
          }

          &.active {
            background-color: rgba(0, 0, 0, 0.08);
          }
        }
    }
  }

  // 主内容区
  main {
    flex: 1;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    position: relative;
    min-width: 0;
    overflow: hidden;
    border-left: 1px solid rgb(220, 220, 220);

    // 照片墙内容区域
    .moments-content {
      flex: 1;
      margin: 0;
      background: white;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
  }

  // 响应式设计
  @media (max-width: 768px) {
    .sidebar {
      width: 200px;
      padding: 20px 12px 10px;

      .nav-item {
        font-size: 13px;

        i {
          font-size: 14px;
        }
      }
    }

    main {
      .moments-content {
        margin: 10px;

        .content-header {
          flex-direction: column;
          gap: 15px;
          text-align: center;
          padding: 15px 15px 0 15px;

          .tabs {
            justify-content: center;
          }
        }
      }
    }
  }

  @media (max-width: 480px) {
    .sidebar {
      width: 180px;
    }
  }
}
</style>
