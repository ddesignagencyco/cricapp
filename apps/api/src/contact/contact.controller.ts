import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ContactService } from './contact.service.js';
import {
  ContactListQuery,
  CreateContactDto,
  UpdateContactStatusDto,
} from './dto/contact.dto.js';

@ApiTags('contact')
@Controller('contact')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit a contact-us message' })
  create(@Body() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }
}

@ApiTags('admin')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/contact-submissions')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ContactAdminController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @ApiOperation({ summary: 'List contact-us submissions (admin)' })
  list(@Query() query: ContactListQuery) {
    return this.contactService.list(query);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update a contact submission status (admin)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateContactStatusDto,
  ) {
    return this.contactService.updateStatus(id, dto);
  }
}
