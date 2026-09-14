import {
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  GalleryListQuery,
  UploadGalleryMediaDto,
} from './dto/gallery.dto.js';
import { GalleryService } from './gallery.service.js';

@ApiTags('gallery')
@Controller('gallery')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  @ApiOperation({ summary: 'List gallery media, optionally filtered by type' })
  list(@Query() query: GalleryListQuery) {
    return this.galleryService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one gallery media item' })
  getById(@Param('id') id: string) {
    return this.galleryService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiCookieAuth()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Upload gallery media (image, short up to 30s, video up to 60s)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: ['image', 'short', 'video'] },
        title: { type: 'string' },
        caption: { type: 'string' },
      },
    },
  })
  upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^(image|video)\//,
            skipMagicNumbersValidation: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadGalleryMediaDto,
  ) {
    return this.galleryService.upload(file, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Delete gallery media from Cloudinary and DB' })
  remove(@Param('id') id: string) {
    return this.galleryService.remove(id);
  }
}
