export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  statusCode: number;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  error?: string;
  path: string;
  timestamp: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
