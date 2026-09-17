import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

export const GALLERY_TYPES = ['image', 'short', 'video'] as const;
export type GalleryType = (typeof GALLERY_TYPES)[number];

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
}

export class GalleryListQuery extends PaginationQuery {
  @ApiPropertyOptional({ enum: GALLERY_TYPES })
  @IsOptional()
  @IsIn(GALLERY_TYPES)
  type?: GalleryType;
}
