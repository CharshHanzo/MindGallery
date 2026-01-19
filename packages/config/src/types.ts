export interface DatabaseConfig {
  url: string
  host?: string | undefined
  port?: number | undefined
  database?: string | undefined
  username?: string | undefined
  password?: string | undefined
}

export interface OllamaConfig {
  url: string
  model: string
}

export interface MinioConfig {
  endpoint: string
  port: number
  accessKey: string
  secretKey: string
  bucket: string
  useSSL: boolean
}

export interface StorageConfig {
  type: 'local' | 'minio'
  uploadDir: string
  minio?: MinioConfig
}

export interface ServerConfig {
  port: number
  nodeEnv: string
  corsOrigin: string | string[] | boolean
}

export interface FrontendConfig {
  apiBaseUrl: string
  baseUrl: string
}

export interface AppConfig {
  server: ServerConfig
  database: DatabaseConfig
  ollama: OllamaConfig
  storage: StorageConfig
  frontend: FrontendConfig
}