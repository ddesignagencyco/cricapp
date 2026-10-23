import { Module } from '@nestjs/common';
import {
  NewsletterAdminController,
  NewsletterController,
} from './newsletter.controller.js';
import { NewsletterService } from './newsletter.service.js';
import { NewsletterCampaignService } from './newsletter-campaign.service.js';
import { NewsletterContentService } from './newsletter-content.service.js';
import { MailerModule } from '../mailer/mailer.module.js';

@Module({
  imports: [MailerModule],
  controllers: [NewsletterController, NewsletterAdminController],
  providers: [NewsletterService, NewsletterCampaignService, NewsletterContentService],
})
export class NewsletterModule {}
