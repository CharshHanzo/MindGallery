<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 标签数据
const tabs = ref([
  { id: 'allGallery', name: '全部图库', path: '/allGallery', active: true },
  { id: 'myAlbums', name: '我的影集', path: '/myAlbums', active: false },
  { id: 'memoryMap', name: '足迹地图', path: '/memoryMap', active: false }
])

// 当前激活的标签
const activeTab = ref('allGallery')

// 滚动状态
const isScrolled = ref(false)
const scrollThreshold = 200 // 背景图高度阈值

// 切换标签
const changeTab = (tabId: string, path: string) => {
  // 更新所有标签的 active 状态
  tabs.value.forEach(tab => {
    tab.active = tab.id === tabId
  })

  // 更新当前激活的标签
  activeTab.value = tabId

  // 路由跳转
  router.push(path)
}

// 处理滚动事件
const handleScroll = () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  isScrolled.value = scrollTop > scrollThreshold
}

// 类型安全的防抖函数
const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// 防抖的滚动处理
const debouncedScroll = debounce(handleScroll, 10)

onMounted(() => {
  window.addEventListener('scroll', debouncedScroll)
  // 初始检查一次
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', debouncedScroll)
})
</script>

<template>
  <div class="moments-view">
    <!-- 顶部背景图和用户信息 -->
    <div class="profile-header">
      <div class="cover-image">
        <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
             alt="封面背景" class="cover-img" />
        <div class="cover-overlay"></div>
      </div>
      <div class="action-btn" :class="{ 'scrolled': isScrolled }">
        <el-icon @click="router.push('/test-directory-picker')" title="测试组件"><Folder /></el-icon>
        <el-icon @click="router.push('/setting')"><Setting /></el-icon>
      </div>
      <div class="user-info">
        <div class="avatar-container">
          <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
               alt="用户头像" class="user-avatar" />
          <div class="avatar-frame"></div>
        </div>
        <div class="user-details">
          <h2 class="username">MindGallery 用户</h2>
          <p class="user-bio">分享生活中的美好瞬间</p>
          <div class="stats">
            <span class="stat-item">
              <strong>128</strong> 照片
            </span>
            <span class="stat-item">
              <strong>36</strong> 相册
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 照片墙部分 -->
    <div class="moments-content">
      <div class="content-header">
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab"
            :class="{ active: tab.active }"
            @click="changeTab(tab.id, tab.path)"
          >
            {{ tab.name }}
          </button>
        </div>

        <div class="actions">
          <el-button type="primary" round @click="router.push('/upload')">
            <el-icon class="el-icon--left"><Plus /></el-icon>上传照片
          </el-button>
        </div>
      </div>
      <div class="content-body">
        <router-view />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.moments-view {
  min-height: 100vh;
  background: linear-gradient(135deg, $winter-sky-1 0%, $winter-sky-2 100%);
  display: flex;
  flex-direction: column;
  // 顶部背景图和用户信息
  .profile-header {
    position: relative;
    height: 300px;

    .cover-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;

      .cover-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: brightness(0.9);
      }

      .cover-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        // background: linear-gradient(to bottom, rgba($winter-sky-5, 0.4), rgba($winter-sky-3, 0.2));
      }
    }

    .action-btn {
      color: white;
      font-size: 2rem;
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
      z-index: 1000;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      padding: 8px;
      border-radius: 8px;

      &.scrolled {
        background: rgba($winter-sky-5, 0.9);
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 12px rgba($winter-sky-5, 0.3);

        .el-icon {
          color: white;

          &:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        }
      }

      .el-icon {
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.3s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }
      }
    }

    .user-info {
      position: absolute;
      bottom: -60px;
      left: 20px;
      right: 20px;
      display: flex;
      align-items: flex-end;
      gap: 20px;

      .avatar-container {
        position: relative;

        .user-avatar {
          width: 120px;
          height: 120px;
          border-radius: 8px;
          object-fit: cover;
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .avatar-frame {
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border: 2px solid rgba(255, 255, 255, 0.8);
          border-radius: 12px;
          pointer-events: none;
        }
      }

      .user-details {
        flex: 1;
        color: white;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
        margin-bottom: 10px;

        .username {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .user-bio {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 12px;
        }

        .stats {
          display: flex;
          gap: 20px;

          .stat-item {
            font-size: 13px;
            opacity: 0.8;

            strong {
              font-weight: 600;
              opacity: 1;
            }
          }
        }
      }
    }
  }

  // 照片墙内容区域
  .moments-content {
    flex: 1;
    margin-top: 75px;
    margin-left: 20px;
    margin-right: 20px;
    margin-bottom: 20px;
    background: white;
    border-radius: 12px 12px 12px 12px;
    box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.1);
    min-height: calc(100vh - 75px);
    display: flex;
    flex-direction: column;
    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 20px 0 20px;
      margin-bottom: 20px;

      .tabs {
        display: flex;
        gap: 0;

        .tab {
            padding: 10px 20px;
            border: none;
            background: transparent;
            color: #666;
            font-size: 14px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;

            &::before {
              content: '';
              position: absolute;
              bottom: 0;
              left: 50%;
              width: 0;
              height: 2px;
              background: $winter-sky-5;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              transform: translateX(-50%);
            }

            &.active {
              color: $winter-sky-5;
              font-weight: 500;

              &::before {
                width: 80%;
              }
            }

            &:hover:not(.active) {
              color: #333;
              transform: translateY(-1px);

              &::before {
                width: 40%;
                background: rgba($winter-sky-5, 0.5);
              }
            }
          }
      }

      .actions {
        .upload-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: $winter-sky-5;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;

          &:hover {
            background: $winter-sky-4;
            transform: translateY(-1px);
          }

          .icon {
            font-size: 16px;
          }
        }
      }
    }

    // 照片网格
    .photos-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 15px;
      padding: 0 20px;
      margin-bottom: 20px;

      .photo-item {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);

          .photo-overlay {
            opacity: 1;
          }
        }

        .photo-wrapper {
          position: relative;
          aspect-ratio: 1;

          .photo-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .photo-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 15px;
            opacity: 0;
            transition: opacity 0.3s ease;

            .photo-actions {
              display: flex;
              justify-content: center;
              gap: 15px;

              .action-btn {
                width: 36px;
                height: 36px;
                border: none;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(10px);
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 14px;

                &:hover {
                  transform: scale(1.1);
                  background: white;
                }

                &.like-btn:hover {
                  color: #ff4757;
                }

                &.comment-btn:hover {
                  color: #2ed573;
                }

                &.share-btn:hover {
                  color: #3742fa;
                }
              }
            }

            .photo-info {
              color: white;
              font-size: 12px;
              display: flex;
              justify-content: space-between;

              .photo-date {
                opacity: 0.9;
              }

              .photo-likes {
                font-weight: 500;
              }
            }
          }
        }
      }
    }

    // 加载更多
    .load-more {
      text-align: center;
      padding: 20px;
      border-top: 1px solid #f0f0f0;

      .load-more-btn {
        padding: 12px 30px;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        color: #666;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          border-color: $winter-sky-5;
          color: $winter-sky-5;
          transform: translateY(-1px);
        }
      }
    }
  }

  // 响应式设计
  @media (max-width: 768px) {
    .profile-header {
      height: 250px;

      .user-info {
        bottom: -50px;
        left: 15px;
        right: 15px;
        gap: 15px;

        .avatar-container .user-avatar {
          width: 100px;
          height: 100px;
        }

        .user-details .username {
          font-size: 20px;
        }
      }
    }

    .moments-content {
      margin-top: 80px;
      min-height: calc(100vh - 80px);

      .content-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
        padding: 15px 15px 0 15px;

        .tabs {
          justify-content: center;
        }
      }

      .photos-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 10px;
        padding: 0 15px;
      }

      .load-more {
        padding: 15px;
      }
    }
  }

  @media (max-width: 480px) {
    .photos-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}
</style>
