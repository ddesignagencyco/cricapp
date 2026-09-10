import { IsString, IsOptional, IsIn, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'fcm_token_abc123...' })
  @IsString()
  fcmToken: string;

  @ApiProperty({ enum: ['web', 'android', 'ios'] })
  @IsString()
  @IsIn(['web', 'android', 'ios'])
  platform: string;
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ example: { matchStart: true, wicket: true, milestone: false, matchEnd: true } })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, boolean>;
}

export class DeviceDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) userId: string | null;
  @ApiProperty() fcmToken: string;
  @ApiProperty() platform: string;
  @ApiProperty() preferences: Record<string, boolean>;
  @ApiProperty() createdAt: Date;
}

export class NotifyPayloadDto {
  @ApiProperty({ example: 'sr:match:12345' })
  @IsString()
  matchId: string;

  @ApiProperty({ example: 'matchStart' })
  @IsString()
  @IsIn(['matchStart', 'wicket', 'milestone', 'matchEnd'])
  event: string;

  @ApiPropertyOptional({ example: 'Babar Azam scored a century!' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Babar Azam reached 100 runs off 95 balls' })
  @IsOptional()
  @IsString()
  body?: string;
}
