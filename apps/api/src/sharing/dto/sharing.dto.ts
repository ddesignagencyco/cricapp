import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShareLinkDto {
  @ApiProperty({ example: 'match' })
  @IsString()
  @IsIn(['match', 'news', 'player', 'team'])
  type: string;

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
