import { ApiProperty } from '@nestjs/swagger';

export class MatchTimelineDto {
  @ApiProperty({ description: 'Provider match id.' })
  matchId: string;

  @ApiProperty({ description: 'Full Sportradar timeline payload (ball-by-ball).' })
  payload: Record<string, unknown>;
}