import { Controller, Get, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SharingService } from './sharing.service.js';
import { ShareLinkResponseDto } from './dto/sharing.dto.js';

@ApiTags('sharing')
@Controller('share')
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Get(':type/:id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Generate a share link with OG meta' })
  @ApiParam({ name: 'type', enum: ['match', 'news', 'player', 'team'] })
  @ApiParam({ name: 'id', description: 'Entity ID or slug' })
  @ApiResponse({ status: 200, type: ShareLinkResponseDto })
  async getShareLink(
    @Param('type') type: string,
    @Param('id') id: string,
  ): Promise<ShareLinkResponseDto> {
    return this.sharingService.getShareLink(type, id);
  }
}
