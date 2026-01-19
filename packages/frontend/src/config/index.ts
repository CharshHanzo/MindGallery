import { config } from '@mindgallery/config'

// 前端专用配置
export const frontendConfig = {
  // API基础URL
  apiBaseUrl: config.frontend.apiBaseUrl,
  
  // 应用基础URL
  baseUrl: config.frontend.baseUrl,
  
  // 开发环境判断
  isDevelopment: config.server.nodeEnv === 'development',
  isProduction: config.server.nodeEnv === 'production',
  
  // 功能开关
  features: {
    upload: true,
    aiAnalysis: true,
    imageGallery: true
  },
  
  // API端点
  endpoints: {
    upload: `${config.frontend.apiBaseUrl}/api/upload`,
    images: `${config.frontend.apiBaseUrl}/api/images`,
    health: `${config.frontend.apiBaseUrl}/api/health`
  },
  
  // 上传配置
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFiles: 10
  }
}

export default frontendConfig