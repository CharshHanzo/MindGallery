import dotenv from 'dotenv'
import path from 'path'

// 加载环境变量
dotenv.config({
    path: path.resolve(process.cwd(), '.env')
})

export const config = {
    // 服务器配置
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',

    // 数据库配置
    databaseUrl: process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/mindgallery',

    // AI服务配置
    ollama:{
        url:process.env.OLLAMA_URL || 'http://localhost:11434',
        model:process.env.OLLAMA_MODEL || 'moondream:latest',
    },

    // 存储配置
    storage: {
        type:process.env.STORAGE_TYPE || 'minio',
        uploadDir:process.env.UPLOAD_DIR || './uploads',

        // Minio配置
        minio:{
        endpoint:process.env.MINIO_ENDPOINT || 'localhost',
        port:parseInt(process.env.MINIO_PORT || '9000'),
        accessKey:process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey:process.env.MINIO_SECRET_KEY || 'minioadmin',
        bucket:process.env.MINIO_BUCKET || 'images',
        useSSL:process.env.MINIO_USE_SSL === 'true',
        }
    }
}
