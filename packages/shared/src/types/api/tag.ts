// 标签相关API契约（前后端共享）

// 标签信息
export interface TagInfo {
  id: string;        // 唯一标识符
  name: string;      // 标签名称
  count: number;     // 使用次数
}

// 标签列表响应
export interface TagsListResponse {
  success: boolean;
  message: string;
  data: TagInfo[];
}
