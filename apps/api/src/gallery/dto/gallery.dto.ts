import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.query.js';
import {
  GALLERY_TYPES,
  MEDIA_PURPOSES,
  type GalleryType,
  type MediaPurpose,
} from '../gallery.constants.js';

export { GALLERY_TYPES, type GalleryType };
export { MEDIA_PURPOSES, type MediaPurpose };

export class UploadGalleryMediaDto {
  @ApiProperty({ enum: GALLERY_TYPES })
  @IsIn(GALLERY_TYPES)
  type: GalleryType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string;

  @ApiPropertyOptional({
    enum: MEDIA_PURPOSES,
    description: 'gallery = public gallery; editorial = news covers / admin library only',
    default: 'gallery',
  })
  @IsOptional()
  @IsIn(MEDIA_PURPOSES)
  purpose?: MediaPurpose;
}

export class GalleryListQuery extends PaginationQuery {
  @ApiPropertyOptional({ enum: GALLERY_TYPES })
  @IsOptional()
  @IsIn(GALLERY_TYPES)
  type?: GalleryType;
}

export class AdminGalleryListQuery extends GalleryListQuery {
  @ApiPropertyOptional({ enum: MEDIA_PURPOSES })
  @IsOptional()
  @IsIn(MEDIA_PURPOSES)
  purpose?: MediaPurpose;
}
