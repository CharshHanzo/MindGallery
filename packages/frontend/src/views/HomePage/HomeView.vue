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
        <a href="#" class="nav-item">
          <el-icon><Star /></el-icon>
          <span>个人收藏</span>
        </a>
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
      <!-- 照片墙部分 -->
      <div class="moments-content">
        <!-- 共享头部 -->
        <div class="content-header">
          <div class="search-wrapper">
            <el-icon class="search-icon"><Search /></el-icon>
            <el-input
              v-model="searchQuery"
              placeholder="搜索照片..."
              class="search-input"
              clearable
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            >
            </el-input>
          </div>
          <div class="header-actions">
            <div id="btn-add" style="color: var(--accent-blue); font-size: 20px; cursor: pointer; padding: 4px;" @click="router.push('/upload')">
              <el-icon><Plus /></el-icon>
            </div>
            <el-button class="text-btn" @click="toggleSelectionMode">
              {{ selectionMode ? '取消' : '选择' }}
            </el-button>
          </div>
        </div>
        <!-- 动态内容区 -->
        <div class="content-body">
          <router-view />
        </div>
      </div>
    </main>
  </div>
</template>

<style lang="scss" scoped>
:root {
  --sidebar-bg: rgba(246, 246, 246, 0.75);
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
    background-color: var(--sidebar-bg);
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
    background-color: var(--main-bg);
    display: flex;
    flex-direction: column;
    position: relative;
    min-width: 0;
    overflow: hidden;

    // 照片墙内容区域
    .moments-content {
      flex: 1;
      margin: 0 20px 20px;
      background: white;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      .content-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        margin-bottom: 0;

        .search-wrapper {
          position: relative;
          width: 380px;

          .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-secondary);
            font-size: 14px;
            z-index: 1;
          }

          .search-input {
            width: 100% !important;
            background-color: #f2f2f7 !important;
            border: none !important;
            padding: 8px 12px 8px 0 !important;
            border-radius: 10px !important;
            font-size: 14px !important;
            outline: none !important;
            box-shadow: none !important;
            height: auto !important;
            line-height: normal !important;
            transition: none !important;
          }

          .search-input:hover,
          .search-input:focus {
            background-color: #f2f2f7 !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
          }

          /* 覆盖 Element Plus 输入框样式 */
          :deep(.el-input__wrapper) {
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          :deep(.el-input__inner) {
            background-color: #f2f2f7 !important;
            border: none !important;
            padding: 8px 12px 8px 36px !important;
            border-radius: 10px !important;
            font-size: 14px !important;
            outline: none !important;
            box-shadow: none !important;
            height: auto !important;
            line-height: normal !important;
          }

          :deep(.el-input__inner:hover),
          :deep(.el-input__inner:focus) {
            background-color: #f2f2f7 !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
          }

          /* 覆盖清除按钮样式 */
          :deep(.el-input__clear) {
            color: var(--text-secondary) !important;
            font-size: 14px !important;
          }

          :deep(.el-input__clear:hover) {
            color: var(--text-primary) !important;
          }
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;

          .text-btn {
            background: none;
            border: none;
            color: var(--accent-blue);
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;

            &:hover {
              background-color: rgba(0, 122, 255, 0.1);
            }
          }
        }
      }

      .content-body {
        flex: 1;
        overflow: hidden;
      }
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
