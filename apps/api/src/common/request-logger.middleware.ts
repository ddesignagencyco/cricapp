import {
  Injectable,
  NestMiddleware,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLogger implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    // Integration specs drive the app in-process and assert on status codes, so
    // these lines duplicate what the assertions already prove. Suites also
    // exercise error paths on purpose (an unconfigured AdSense client answers
    // 503), which would otherwise print as ERROR and read like a failure.
    if (process.env.NODE_ENV === 'test') return next();

    const start = Date.now();

    res.on('finish', () => {
      const ms = Date.now() - start;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'log';
      this.logger[level](
        `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`,
      );
    });

    next();
  }
}
