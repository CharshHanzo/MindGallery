import { config, validateConfig } from './packages/config/dist/index.mjs'

console.log('🔧 测试统一配置管理\n')

console.log('=== 配置信息 ===')
console.log('服务器配置:', JSON.stringify(config.server, null, 2))
console.log('数据库配置:', JSON.stringify({
  ...config.database,
  password: '***' // 隐藏密码
}, null, 2))
console.log('AI服务配置:', JSON.stringify(config.ollama, null, 2))
console.log('存储配置:', JSON.stringify(config.storage, null, 2))
console.log('前端配置:', JSON.stringify(config.frontend, null, 2))

console.log('\n=== 配置验证 ===')
const validation = validateConfig(config)
if (validation.isValid) {
  console.log('✅ 配置验证通过')
} else {
  console.log('❌ 配置验证失败:')
  validation.errors.forEach(error => console.log(`  - ${error}`))
}

console.log('\n✅ 统一配置管理测试完成')