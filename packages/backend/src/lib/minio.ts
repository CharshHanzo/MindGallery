import { Client } from "minio";
import { config } from "./config";
import { version } from "node:os";

// 确保是Minio配置
if (config.storage.type !== 'minio' || !config.storage.minio) {
    throw new Error('Minio configuration is required');
}

// 使用类型断言确保TypeScript知道minio配置存在
const minioConfig = config.storage.minio as NonNullable<typeof config.storage.minio>;

// 创建Minio客户端实例
export const minioClient = new Client({
    endPoint: minioConfig.endpoint,
    port: minioConfig.port,
    accessKey: minioConfig.accessKey,
    secretKey: minioConfig.secretKey,
    useSSL: minioConfig.useSSL,
})

// 确保储存桶存在
export async function ensureBucket() {
    try {
        const bucketExists = await minioClient.bucketExists(minioConfig.bucket)
        if(!bucketExists) {
            console.log(`Create Bucket ${minioConfig.bucket}`)
            await minioClient.makeBucket(minioConfig.bucket,'us-east-1')

            // 设置公共读取权限
            const policy = {
                version:'2012-10-17',
                Statement:[
                    {
                        Effect:'Allow',
                        Principal:'*',
                        Action:['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${minioConfig.bucket}/*`]
                    },
                ],
            }
            await minioClient.setBucketPolicy(minioConfig.bucket,JSON.stringify(policy))
            console.log('Create bucket Success')
        }
    } catch (error) {
        console.error('Error ensuring bucket:', error)
        throw error
    }
}