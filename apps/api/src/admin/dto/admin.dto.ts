import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, IsIn } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ListUsersQuery {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'test' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}

export class ReportCommentDto {
  @ApiProperty({ example: 'spam' })
  @IsString()
  reason: string;
}

export class ModerateCommentDto {
  @ApiProperty({ example: 'approved', enum: ['approved', 'hidden', 'deleted'] })
  @IsIn(['approved', 'hidden', 'deleted'])
  status: string;
}

export class ResolveReportDto {
  @ApiPropertyOptional({ example: 'resolved' })
  @IsOptional()
  @IsIn(['pending', 'resolved', 'dismissed'])
  status?: string;
}

export class CreateStreamDto {
  @ApiProperty({ example: 'PSL Final: LQ vs KK' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'sr:match:12345' })
  @IsOptional()
  @IsString()
  matchId?: string;

  @ApiProperty({ example: 'https://youtube.com/embed/abc123' })
  @IsString()
  streamUrl: string;

  @ApiPropertyOptional({ example: 'YouTube' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: 'https://img.youtube.com/abc.jpg' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'upcoming', enum: ['upcoming', 'live', 'ended'] })
  @IsOptional()
  @IsIn(['upcoming', 'live', 'ended'])
  status?: string;

  @ApiPropertyOptional({ example: '2026-09-15T14:00:00Z' })
  @IsOptional()
  @IsString()
  scheduledAt?: string;
}
