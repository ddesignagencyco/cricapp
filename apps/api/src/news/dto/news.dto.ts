import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

export class CreateNewsDto {
  @ApiProperty({ example: 'PSL 2026 Final Preview' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'A look ahead to the PSL final...' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ example: 'Full article content in markdown or HTML...' })
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'CricApp Editorial' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: ['psl', 'cricket', 'final'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateNewsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class NewsListQuery extends PaginationQuery {
  @ApiPropertyOptional({ description: 'Filter by category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Search in title and summary' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class NewsCategoryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
}

export class NewsArticleDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() slug: string;
  @ApiProperty({ nullable: true }) summary: string | null;
  @ApiProperty() content: string;
  @ApiProperty({ nullable: true }) imageUrl: string | null;
  @ApiProperty({ nullable: true }) author: string | null;
  @ApiProperty({ nullable: true }) source: string | null;
  @ApiProperty({ nullable: true }) categoryId: string | null;
  @ApiProperty({ nullable: true }) tags: string[] | null;
  @ApiProperty({ nullable: true }) publishedAt: Date | null;
  @ApiProperty() isPublished: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ nullable: true }) category: NewsCategoryDto | null;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'PSL' })
  @IsString()
  name: string;
}
