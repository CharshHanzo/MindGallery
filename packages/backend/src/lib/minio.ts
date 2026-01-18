import { Client } from "minio";
import { config } from "./config";
import { version } from "node:os";
// 创建Minio客户端实例
export const minioClient = new Client({
    endPoint: config.storage.minio.endpoint,
    port: config.storage.minio.port,
    accessKey: config.storage.minio.accessKey,
    secretKey: config.storage.minio.secretKey,
    useSSL: config.storage.minio.useSSL,
})

// 确保储存桶存在
export async function ensureBucket() {
    try {
        const bucketExists = await minioClient.bucketExists(config.storage.minio.bucket)
        if(!bucketExists) {
            console.log(`Create Bucket ${config.storage.minio.bucket}`)
            await minioClient.makeBucket(config.storage.minio.bucket,'us-east-1')

            // 设置公共读取权限
            const policy = {
                version:'2012-10-17',
                Statement:[
                    {
                        Effect:'Allow',
                        Principal:'*',
                        Action:['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${config.storage.minio.bucket}/*`]
                    },
                ],
            }
            await minioClient.setBucketPolicy(config.storage.minio.bucket,JSON.stringify(policy))
            console.log('Create bucket Success')
        }
    } catch (error) {
        console.error('Error ensuring bucket:', error)
        throw error
    }
}