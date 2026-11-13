import { Global, Module } from '@nestjs/common';
import { RequestMetricsService } from './request-metrics.service.js';

/**
 * Request counters are process-wide: the HTTP middleware writes them and the
 * public landing page reads them. A global module keeps a single instance.
 */
@Global()
@Module({
  providers: [RequestMetricsService],
  exports: [RequestMetricsService],
})
export class MetricsModule {}
