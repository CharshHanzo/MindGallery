// 搜索相关API契约（前后端共享）

// 搜索图片请求
export interface SearchImagesRequest {
  query?: string;
  tags?: string[];
  categories?: string[];
  startDate?: string;
  endDate?: string;
  ratingMin?: number;
  favorite?: boolean;
  sortBy?: 'recent' | 'oldest' | 'rating' | 'views';
  page?: number;
  limit?: number;
}

// 搜索结果响应
export interface SearchImagesResponse {
  success: boolean;
  message: string;
  data: {
    images: Array<{
      id: string;
      filename: string;
      url: string;
      thumbnailUrl: string;
      tags: string[];
      uploadTime: Date;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    searchStats: {
      totalMatches: number;
      searchTime: number; // 毫秒
    };
  };
}

// 搜索建议请求
export interface SearchSuggestionsRequest {
  query: string;
  type?: 'tags' | 'categories' | 'all';
  limit?: number;
}

// 搜索建议响应
export interface SearchSuggestionsResponse {
  success: boolean;
  message: string;
  data: {
    suggestions: Array<{
      text: string;
      type: 'tag' | 'category';
      count?: number;
    }>;
  };
}
