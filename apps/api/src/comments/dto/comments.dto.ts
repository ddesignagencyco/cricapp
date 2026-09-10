import { IsString, IsIn, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

export class CreateCommentDto {
  @ApiProperty({ enum: ['match', 'news'] })
  @IsString()
  @IsIn(['match', 'news'])
  targetType: string;

  @ApiProperty({ example: 'sr:match:12345' })
  @IsString()
  targetId: string;

  @ApiProperty({ example: 'Great innings by Babar!' })
  @IsString()
  @MinLength(1)
  body: string;
}

export class CreateReactionDto {
  @ApiProperty({ enum: ['match', 'news', 'comment'] })
  @IsString()
  @IsIn(['match', 'news', 'comment'])
  targetType: string;

  @ApiProperty({ example: 'sr:match:12345' })
  @IsString()
  targetId: string;

  @ApiProperty({ example: '🔥' })
  @IsString()
  emoji: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentId?: string;
}

export class CommentListQuery extends PaginationQuery {
  @ApiProperty({ enum: ['match', 'news'] })
  @IsString()
  @IsIn(['match', 'news'])
  targetType: string;

  @ApiProperty({ example: 'sr:match:12345' })
  @IsString()
  targetId: string;
}

export class ReactionQuery {
  @ApiProperty({ enum: ['match', 'news', 'comment'] })
  @IsString()
  @IsIn(['match', 'news', 'comment'])
  targetType: string;

  @ApiProperty({ example: 'sr:match:12345' })
  @IsString()
  targetId: string;
}

export class CommentDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() targetType: string;
  @ApiProperty() targetId: string;
  @ApiProperty() body: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: Object, nullable: true }) user: { id: string; username: string; displayName: string | null } | null;
}

export class ReactionCountsDto {
  @ApiProperty({ example: { '🔥': 5, '❤️': 3 } })
  counts: Record<string, number>;
  @ApiProperty({ example: ['🔥', '❤️'] })
  emojis: string[];
}

export class ReportCommentDto {
  @ApiProperty({ example: 'spam' })
  @IsString()
  @MinLength(1)
  reason: string;
}
