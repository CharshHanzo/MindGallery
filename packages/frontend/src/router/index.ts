import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      children:[
        {
          path: '/allGallery',
          name: 'allGallery',
          component: () => import('../views/AllGalleryView.vue'),
        },
        {
          path: '/memoryMap',
          name: 'memoryMap',
          component: () => import('../views/MemoryMapView.vue'),
        },
        {
          path: '/myAlbums',
          name: 'myAlbums',
          component: () => import('../views/MyAlbumsView.vue'),
        },
      ]
    },
  ],
})

export default router
