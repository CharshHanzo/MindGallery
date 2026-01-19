import dotenv from 'dotenv'
import path from 'path'
import type { AppConfig, DatabaseConfig, OllamaConfig, StorageConfig, ServerConfig, FrontendConfig } from './types.js'

// 加载环境变量
dotenv.config({
  path: path.resolve(process.cwd(), '.env')
})

// 解析数据库URL为详细配置
function parseDatabaseUrl(url: string): DatabaseConfig {
  try {
    const urlObj = new URL(url)
    const host = urlObj.hostname
    const port = urlObj.port ? parseInt(urlObj.port) : undefined
    const database = urlObj.pathname.slice(1) // 移除开头的 /
    const username = urlObj.username || undefined
    const password = urlObj.password || undefined
    
    return {
      url,
      host,
      port,
      database,
      username,
      password
    }
  } catch {
    // 如果URL解析失败，返回基础配置
    return { url }
  }
}

// 获取服务器配置
export function getServerConfig(): ServerConfig {
  return {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || true
  }
}

// 获取数据库配置
export function getDatabaseConfig(): DatabaseConfig {
  const url = process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/mindgallery'
  return parseDatabaseUrl(url)
}

// 获取AI服务配置
export function getOllamaConfig(): OllamaConfig {
  return {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'moondream:latest'
  }
}

// 获取存储配置
export function getStorageConfig(): StorageConfig {
  const storageType = process.env.STORAGE_TYPE || 'minio'
  const config: StorageConfig = {
    type: storageType as 'local' | 'minio',
    uploadDir: process.env.UPLOAD_DIR || './uploads'
  }

  if (storageType === 'minio') {
    config.minio = {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      bucket: process.env.MINIO_BUCKET || 'images',
      useSSL: process.env.MINIO_USE_SSL === 'true'
    }
  }

  return config
}

// 获取前端配置
export function getFrontendConfig(): FrontendConfig {
  return {
    apiBaseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
    baseUrl: process.env.VITE_BASE_URL || '/'
  }
}

// 获取完整应用配置
export function getConfig(): AppConfig {
  return {
    server: getServerConfig(),
    database: getDatabaseConfig(),
    ollama: getOllamaConfig(),
    storage: getStorageConfig(),
    frontend: getFrontendConfig()
  }
}

// 验证配置
export function validateConfig(config: AppConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('服务器端口必须在 1-65535 范围内')
  }

  if (!config.database.url) {
    errors.push('数据库连接URL不能为空')
  }

  if (!config.ollama.url) {
    errors.push('AI服务URL不能为空')
  }

  if (config.storage.type === 'minio' && !config.storage.minio) {
    errors.push('MinIO存储配置不完整')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// 默认配置导出
export const config = getConfig()
export default config