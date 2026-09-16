import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const SHARE_TARGET_TYPES = [
  'match',
  'news',
  'player',
  'team',
  'tour',
  'tournament',
] as const;
export type ShareTargetType = (typeof SHARE_TARGET_TYPES)[number];

export class ShareLinkDto {
  @ApiProperty({ example: 'match', enum: SHARE_TARGET_TYPES })
  @IsString()
  @IsIn(SHARE_TARGET_TYPES)
  type: ShareTargetType;

  @ApiProperty({ example: 'sr:match:12345' })
  @IsString()
  id: string;
}

export class ShareLinkResponseDto {
  @ApiProperty({ example: 'https://cricapp.com/matches/sr:match:12345' })
  url: string;

  @ApiProperty({ example: 'PAK vs IND — CricApp' })
  ogTitle: string;

  @ApiProperty({ example: 'Live score updates...' })
  ogDescription: string;

  @ApiProperty({ example: 'https://cricapp.com/api/og/match/sr:match:12345' })
  ogImage: string;
}
