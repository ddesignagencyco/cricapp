import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Request,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  NewsletterCampaignDto,
  NewsletterListQuery,
  NewsletterPreferencesDto,
  NewsletterTestDto,
  NewsletterTokenDto,
  SubscribeNewsletterDto,
  UnsubscribeNewsletterDto,
} from './dto/newsletter.dto.js';
import { NewsletterService } from './newsletter.service.js';
import { NewsletterCampaignService } from './newsletter-campaign.service.js';

@ApiTags('newsletter')
@Controller('newsletter')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class NewsletterController {
  constructor(
    private readonly newsletterService: NewsletterService,
    private readonly campaigns: NewsletterCampaignService,
  ) {}

  @Post('subscribe')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Subscribe an email to the newsletter' })
  subscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.newsletterService.subscribe(dto);
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Unsubscribe using the opaque email-link token' })
  unsubscribe(@Body() dto: UnsubscribeNewsletterDto) {
    return this.newsletterService.unsubscribe(dto);
  }

  /**
   * RFC 8058 one-click unsubscribe, called by Gmail/Yahoo/Apple Mail from the
   * List-Unsubscribe header. The body is "List-Unsubscribe=One-Click"; the token is in the URL.
   */
  @Post('unsubscribe/one-click')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'One-click unsubscribe (List-Unsubscribe-Post)' })
  unsubscribeOneClick(@Query('token', new ParseUUIDPipe()) token: string) {
    return this.newsletterService.unsubscribe({ token });
  }

  @Get('subscription/:token')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Subscription status and preferences for an email-link token' })
  status(@Param('token', new ParseUUIDPipe()) token: string) {
    return this.campaigns.publicStatus(token);
  }

  @Put('preferences')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Turn newsletter types on or off (all off = unsubscribed)' })
  preferences(@Body() dto: NewsletterPreferencesDto) {
    return this.campaigns.updatePreferences(dto.token, dto.preferences);
  }

  @Post('resubscribe')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Undo an unsubscribe using the email-link token' })
  resubscribe(@Body() dto: NewsletterTokenDto) {
    return this.campaigns.resubscribe(dto.token);
  }

  /** Newsletter links pass through here so engagement is known; it only redirects to this site. */
  @Get('click')
  @ApiOperation({ summary: 'Record a newsletter click and redirect to the site' })
  async click(
    @Query('token') token: string | undefined,
    @Query('url') url: string | undefined,
    @Res() res: Response,
  ) {
    res.redirect(302, await this.campaigns.click(token, url));
  }
}

@ApiTags('admin')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/newsletter')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class NewsletterAdminController {
  private readonly logger = new Logger(NewsletterAdminController.name);

  constructor(
    private readonly newsletterService: NewsletterService,
    private readonly campaigns: NewsletterCampaignService,
  ) {}

  @Get('subscribers')
  @ApiOperation({ summary: 'List newsletter subscribers (admin)' })
  list(@Query() query: NewsletterListQuery) {
    return this.newsletterService.list(query);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Newsletter types, auto-send status and recent campaigns' })
  overview() {
    return this.campaigns.overview();
  }

  @Post('campaigns/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Render a newsletter without sending it' })
  preview(@Body() dto: NewsletterCampaignDto) {
    return this.campaigns.preview(dto);
  }

  @Post('campaigns/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send one [TEST] copy to an address (default: you)' })
  test(@Body() dto: NewsletterTestDto, @Request() req: { user: { email: string } }) {
    return this.campaigns.sendTest(dto, dto.to ?? req.user.email);
  }

  /**
   * Sends to every eligible subscriber. Sending is slow on purpose (provider limits), so
   * it continues in the background; progress shows in GET campaigns.
   */
  @Post('campaigns/send')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a newsletter to all eligible subscribers' })
  async send(@Body() dto: NewsletterCampaignDto) {
    const preview = await this.campaigns.preview(dto);
    void this.campaigns.send(dto, new Date(), { throwIfEmpty: true }).catch((error: unknown) => {
      this.logger.error(`Newsletter ${dto.type} send failed: ${error instanceof Error ? error.message : String(error)}`);
    });
    return { started: true, type: dto.type, issueKey: preview.issueKey, subject: preview.subject };
  }
}
