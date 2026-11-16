import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthStatus() {
    return {
      status: 'ok',
      service: 'SEG Academy CRM API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
