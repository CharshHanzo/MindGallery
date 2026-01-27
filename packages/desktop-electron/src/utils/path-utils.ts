import path from 'path';
import { app } from 'electron';

/**
 * 转换 file:// URL 为 Windows 路径
 */
export function urlToWindowsPath(url: string): string {
  // 处理 file:// 协议
  if (url.startsWith('file://')) {
    // Windows路径：file:///C:/path/to/file
    // Unix路径：file:///path/to/file
    
    // 移除 file:// 前缀
    const pathWithoutProtocol = url.replace('file://', '');
    
    // 处理Windows驱动器路径（file:///C:/...）
    if (pathWithoutProtocol.match(/^\/[A-Za-z]:\//)) {
      // 移除开头的斜杠，得到 C:/path/to/file
      return pathWithoutProtocol.substring(1);
    }
    
    // 对于标准Windows网络路径（file://server/share/path）
    if (url.startsWith('file:////')) {
      return url.replace('file://', '');
    }
    
    // 对于Unix-like路径，直接返回
    return decodeURIComponent(pathWithoutProtocol);
  }
  
  // 如果不是 file:// 协议，直接返回
  return decodeURIComponent(url);
}

/**
 * 确保路径是绝对路径
 */
export function ensureAbsolutePath(inputPath: string): string {
  // 如果已经是绝对路径，直接返回
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  
  // 处理相对路径
  // 如果是相对于应用程序目录的路径
  if (inputPath.startsWith('./') || inputPath.startsWith('../')) {
    return path.resolve(app.getAppPath(), inputPath);
  }
  
  // 如果是相对于用户主目录的路径
  if (inputPath.startsWith('~/')) {
    return path.resolve(app.getPath('home'), inputPath.substring(2));
  }
  
  // 其他情况，解析为绝对路径
  return path.resolve(inputPath);
}

/**
 * 完整的路径处理函数
 */
export function processFilePath(rawPath: string): string {
  try {
    console.log('原始路径:', rawPath);
    
    // 1. 转换URL路径
    let processedPath = urlToWindowsPath(rawPath);
    console.log('URL转换后:', processedPath);
    
    // 2. 确保是绝对路径
    processedPath = ensureAbsolutePath(processedPath);
    console.log('绝对路径处理后:', processedPath);
    
    // 3. 规范化路径（处理 .., ., 重复分隔符等）
    processedPath = path.normalize(processedPath);
    console.log('规范化后:', processedPath);
    
    // 4. 处理Windows盘符大小写（可选）
    if (process.platform === 'win32') {
      // 将盘符转为大写：c:\ → C:\
      if (processedPath.match(/^[a-z]:/)) {
        processedPath = processedPath.charAt(0).toUpperCase() + processedPath.slice(1);
      }
    }
    
    console.log('最终路径:', processedPath);
    console.log('是否绝对路径:', path.isAbsolute(processedPath));
    
    return processedPath;
  } catch (error) {
    console.error('路径处理失败:', error);
    throw new Error(`无效的路径: ${rawPath}`);
  }
}

/**
 * 验证路径格式
 */
export function validatePathBeforeSending(filePath: string): string {
  // 确保不是空路径
  if (!filePath || filePath.trim() === '') {
    throw new Error('路径不能为空');
  }
  
  // 如果是 file:// 协议，确保格式正确
  if (filePath.startsWith('file://')) {
    // 简单的格式检查
    if (!filePath.startsWith('file:///')) {
      console.warn('file:// 协议格式可能不正确');
    }
  }
  
  return filePath;
}