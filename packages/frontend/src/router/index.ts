import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/allGallery'
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomePage/HomeView.vue'),
      children:[
        {
          path: '/allGallery',
          name: 'allGallery',
          component: () => import('../views/HomePage/AllGalleryView.vue'),
        },
        {
          path: '/memoryMap',
          name: 'memoryMap',
          component: () => import('../views/HomePage/MemoryMapView.vue'),
        },
        {
          path: '/myAlbums',
          name: 'myAlbums',
          component: () => import('../views/HomePage/MyAlbumsView.vue'),
        },
      ]
    },
    {
      path: '/upload',
      name: 'upload',
      component: () => import('../views/UploadImageView.vue'),
    },
    {
      path: '/test-directory-picker',
      name: 'test-directory-picker',
      component: () => import('../views/TestDirectoryPicker.vue'),
    },
    {
      path: '/test-backend',
      name: 'test-backend',
      component: () => import('../views/TestBackend.vue'),
    }
  ],
})

export default router
