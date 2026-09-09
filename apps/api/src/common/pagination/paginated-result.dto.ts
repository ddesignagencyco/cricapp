import { ApiProperty } from '@nestjs/swagger';

export class PaginatedMetaDto {
  @ApiProperty({ description: 'Current page number (1-indexed).' })
  page: number;

  @ApiProperty({ description: 'Items per page.' })
  limit: number;

  @ApiProperty({ description: 'Total number of records.' })
  totalRecords: number;

  @ApiProperty({ description: 'Total number of pages.' })
  totalPages: number;

  @ApiProperty({ description: 'Whether a next page exists.' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Whether a previous page exists.' })
  hasPrevPage: boolean;
}

export class PaginatedResponseDto<T> {
  data: T[];
  meta: PaginatedMetaDto;

  constructor(data: T[], meta: PaginatedMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
