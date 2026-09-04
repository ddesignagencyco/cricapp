import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

@Injectable()
export class AppLogger implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('App');

  onModuleInit() {
    this.logger.log('Application started');
  }

  onModuleDestroy() {
    this.logger.log('Application shutting down');
  }
}
