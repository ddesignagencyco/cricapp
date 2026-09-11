import { IsString, IsOptional, IsBoolean, IsArray, IsIn, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

export class CreateNewsDto {
  @ApiProperty({ example: 'PSL 2026 Final Preview' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ example: 'psl-2026-final-preview', description: 'SEO slug; generated from title when omitted' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

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

  @ApiPropertyOptional({ description: 'Author profile id' })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ['en', 'ur'], default: 'en' })
  @IsOptional()
  @IsIn(['en', 'ur'])
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Linked player ids' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  playerIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Linked team ids' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Linked match ids' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  matchIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Linked tournament/series ids' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seriesIds?: string[];
}

export class UpdateNewsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'psl-2026-final-preview' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

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
  authorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ['en', 'ur'] })
  @IsOptional()
  @IsIn(['en', 'ur'])
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  playerIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  matchIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seriesIds?: string[];
}

export class NewsListQuery extends PaginationQuery {
  @ApiPropertyOptional({ description: 'Filter by category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Search in title and summary' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['en', 'ur'] })
  @IsOptional()
  @IsIn(['en', 'ur'])
  language?: string;

  @ApiPropertyOptional({ description: 'Filter articles linked to a player id' })
  @IsOptional()
  @IsString()
  playerId?: string;

  @ApiPropertyOptional({ description: 'Filter articles linked to a team id' })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Filter articles linked to a match id' })
  @IsOptional()
  @IsString()
  matchId?: string;

  @ApiPropertyOptional({ description: 'Filter articles linked to a tournament/series id' })
  @IsOptional()
  @IsString()
  seriesId?: string;
}

export class NewsCategoryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
}

export class AuthorDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ nullable: true }) bio: string | null;
  @ApiProperty({ nullable: true }) avatarUrl: string | null;
}

export class NewsArticleDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() slug: string;
  @ApiProperty({ nullable: true }) summary: string | null;
  @ApiProperty() content: string;
  @ApiProperty({ nullable: true }) imageUrl: string | null;
  @ApiProperty({ nullable: true }) author: string | null;
  @ApiProperty({ nullable: true }) authorId: string | null;
  @ApiProperty({ nullable: true }) source: string | null;
  @ApiProperty({ nullable: true }) categoryId: string | null;
  @ApiProperty() language: string;
  @ApiProperty({ nullable: true }) metaTitle: string | null;
  @ApiProperty({ nullable: true }) metaDescription: string | null;
  @ApiProperty({ nullable: true }) canonicalUrl: string | null;
  @ApiProperty({ nullable: true }) publishedAt: Date | null;
  @ApiProperty() isPublished: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ nullable: true }) category: NewsCategoryDto | null;
  @ApiProperty({ nullable: true }) authorRef: AuthorDto | null;
  @ApiProperty({ type: [String] }) playerIds: string[];
  @ApiProperty({ type: [String] }) teamIds: string[];
  @ApiProperty({ type: [String] }) matchIds: string[];
  @ApiProperty({ type: [String] }) seriesIds: string[];
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'PSL' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'psl', description: 'SEO slug; generated from name when omitted' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Pakistan Super League' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'psl' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;
}

export class CreateAuthorDto {
  @ApiProperty({ example: 'Ali Khan' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class UpdateAuthorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
