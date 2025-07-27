export interface CreateUrlResponse {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
}

export interface UrlInfoResponse {
  shortCode: string;
  originalUrl: string;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
  shortUrl: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
}

export interface ErrorResponse {
  message: string;
  statusCode: number;
}
