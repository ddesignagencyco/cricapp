import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RegisterDeviceDto, UpdatePreferencesDto, DeviceDto } from './dto/notifications.dto.js';

@ApiTags('notifications')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Register an FCM device token' })
  @ApiResponse({ status: 201, type: DeviceDto })
  async register(@Request() req: { user: { id: string } }, @Body() dto: RegisterDeviceDto) {
    return this.notificationsService.registerDevice(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List user devices' })
  @ApiResponse({ status: 200, type: [DeviceDto] })
  async list(@Request() req: { user: { id: string } }) {
    return this.notificationsService.listDevices(req.user.id);
  }

  @Patch(':id/preferences')
  @ApiOperation({ summary: 'Update notification preferences for a device' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  @ApiResponse({ status: 200, type: DeviceDto })
  @ApiResponse({ status: 404, description: 'Device not found.' })
  async updatePreferences(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Unregister a device' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  @ApiResponse({ status: 200, description: 'Deleted.' })
  @ApiResponse({ status: 404, description: 'Device not found.' })
  async remove(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.notificationsService.removeDevice(req.user.id, id);
  }
}
