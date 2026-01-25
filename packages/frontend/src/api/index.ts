// API统一入口文件

// 图片相关API
export * from './modules/image';

// 标签相关API
export * from './modules/tag';

// 相册相关API
export * from './modules/album';

// 统一客户端 (推荐使用)
export * from './unified-client';

// 环境检测工具
export { useEnvironment } from '../composables/useEnvironment';

// 兼容性导出
export { electronClient } from './electron-client';
export { webClient } from './web-client';
