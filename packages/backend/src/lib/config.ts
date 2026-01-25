// 统一配置管理 - 使用 @mindgallery/config 包
console.log('Config loaded. DB URL:', process.env.DATABASE_URL ? 'Set' : 'Not Set')

export { config } from '@mindgallery/config'
