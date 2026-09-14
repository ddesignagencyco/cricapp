import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  NewsletterListQuery,
  SubscribeNewsletterDto,
  UnsubscribeNewsletterDto,
} from './dto/newsletter.dto.js';
import { NewsletterService } from './newsletter.service.js';

@ApiTags('newsletter')
@Controller('newsletter')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

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
}

@ApiTags('admin')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/newsletter')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class NewsletterAdminController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Get('subscribers')
  @ApiOperation({ summary: 'List newsletter subscribers (admin)' })
  list(@Query() query: NewsletterListQuery) {
    return this.newsletterService.list(query);
  }
}
