import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

export class CreateStreamDto {
  @ApiProperty({ example: 'PSL 2026 Final — Peshawar Zalmi vs Quetta Gladiators' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  matchId?: string;

  @ApiProperty({ example: 'https://stream.example.com/live/match-123' })
  @IsString()
  streamUrl: string;

  @ApiPropertyOptional({ example: 'Star Sports' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ enum: ['upcoming', 'live', 'ended'], default: 'upcoming' })
  @IsOptional()
  @IsEnum(['upcoming', 'live', 'ended'] as const)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateStreamDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  matchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  streamUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ enum: ['upcoming', 'live', 'ended'] })
  @IsOptional()
  @IsEnum(['upcoming', 'live', 'ended'] as const)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class StreamListQuery extends PaginationQuery {
  @ApiPropertyOptional({ enum: ['upcoming', 'live', 'ended'], description: 'Filter by status' })
  @IsOptional()
  @IsEnum(['upcoming', 'live', 'ended'] as const)
  status?: string;
}

export class LiveStreamDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) matchId: string | null;
  @ApiProperty() streamUrl: string;
  @ApiProperty({ nullable: true }) provider: string | null;
  @ApiProperty({ nullable: true }) thumbnailUrl: string | null;
  @ApiProperty() status: string;
  @ApiProperty({ nullable: true }) scheduledAt: Date | null;
  @ApiProperty({ nullable: true }) startedAt: Date | null;
  @ApiProperty({ nullable: true }) endedAt: Date | null;
  @ApiProperty() createdAt: Date;
}
