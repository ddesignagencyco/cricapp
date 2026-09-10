import { ApiProperty } from '@nestjs/swagger';

export class HeadToHeadDto {
  @ApiProperty({ description: 'First team id (sorted).', example: 'sr:competitor:107203' })
  teamAId: string;

  @ApiProperty({ description: 'Second team id (sorted).', example: 'sr:competitor:142690' })
  teamBId: string;

  @ApiProperty({
    description: 'Full Sportradar head-to-head payload (previous + upcoming meetings).',
    type: Object,
    additionalProperties: true,
  })
  payload: Record<string, unknown>;
}