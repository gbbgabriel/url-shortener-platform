import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
}

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Check service health' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth(): HealthResponse {
    return {
      status: 'OK',
      service: 'identity-service',
      version: '0.2.0',
      timestamp: new Date().toISOString(),
    };
  }
}
