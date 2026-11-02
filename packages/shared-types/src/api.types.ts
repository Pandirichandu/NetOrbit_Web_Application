export interface ApiResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  requestId?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  path: string;
  requestId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  meta?: ApiResponseMeta;
  error?: ApiErrorResponse;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
