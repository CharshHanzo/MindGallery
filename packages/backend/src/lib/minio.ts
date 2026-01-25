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
    const maxRetries = 10;
    const retryDelay = 3000; // 3 seconds

    for (let i = 0; i < maxRetries; i++) {
        try {
            const bucketExists = await minioClient.bucketExists(minioConfig.bucket)
            if(!bucketExists) {
                console.log(`Create Bucket ${minioConfig.bucket}`)
                await minioClient.makeBucket(minioConfig.bucket,'us-east-1')

                // 设置公共读取权限
                const policy = {
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Effect: 'Allow',
                            Principal: { AWS: ['*'] },
                            Action: ['s3:GetObject'],
                            Resource: [`arn:aws:s3:::${minioConfig.bucket}/*`]
                        },
                    ],
                }
                // Note: Standard S3 policy uses TitleCase. MinIO often accepts both but TitleCase is safer.
                // Also Principal: '*' is deprecated/non-standard in some S3 impls, usually { "AWS": ["*"] } or just "*" string.
                // The previous code used lowercase keys and Principal: '*'.
                // To be safe, I will stick to a standard policy format that MinIO definitely supports.
                // But to avoid changing behavior if the previous one worked, I'll use a known working public policy.
                
                const publicPolicy = {
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Effect: 'Allow',
                            Principal: '*',
                            Action: ['s3:GetObject'],
                            Resource: [`arn:aws:s3:::${minioConfig.bucket}/*`]
                        }
                    ]
                }
                
                await minioClient.setBucketPolicy(minioConfig.bucket, JSON.stringify(publicPolicy))
                console.log('Create bucket Success')
            }
            return;
        } catch (error) {
            console.error(`Error ensuring bucket (attempt ${i + 1}/${maxRetries}):`, error instanceof Error ? error.message : error)
            if (i === maxRetries - 1) {
                console.error('Max retries reached. Exiting.')
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
}