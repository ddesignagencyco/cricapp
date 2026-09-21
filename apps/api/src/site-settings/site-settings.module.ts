import { Module } from '@nestjs/common';
import {
  SiteSettingsAdminController,
  SiteSettingsController,
} from './site-settings.controller.js';
import { SiteSettingsService } from './site-settings.service.js';

@Module({
  controllers: [SiteSettingsController, SiteSettingsAdminController],
  providers: [SiteSettingsService],
})
export class SiteSettingsModule {}
