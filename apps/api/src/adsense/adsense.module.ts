import { Module } from '@nestjs/common';
import { SiteSettingsModule } from '../site-settings/site-settings.module.js';
import { AdSenseAdminController } from './adsense.controller.js';
import { AdSenseService } from './adsense.service.js';

@Module({
  // SiteSettingsService is used to pick the ad client matching the configured
  // publisher id, so the ad unit dropdown lists the right account.
  imports: [SiteSettingsModule],
  controllers: [AdSenseAdminController],
  providers: [AdSenseService],
})
export class AdSenseModule {}
