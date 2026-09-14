import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.query.js';

export class CreateContactDto {
  @ApiProperty({ example: 'Ali Khan' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'ali@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'I need help with...' })
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  message: string;
}

export class ContactListQuery extends PaginationQuery {
  @ApiPropertyOptional({ enum: ['new', 'read', 'resolved'] })
  @IsOptional()
  @IsIn(['new', 'read', 'resolved'])
  status?: string;
}

export class UpdateContactStatusDto {
  @ApiProperty({ enum: ['new', 'read', 'resolved'] })
  @IsIn(['new', 'read', 'resolved'])
  status: string;
}
