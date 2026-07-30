import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Validation failed' },
      { type: 'array', items: { type: 'string' } },
    ],
  })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request', required: false })
  error?: string;

  @ApiProperty({ example: '/api/v1/public/contact' })
  path!: string;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class PaginatedDataDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  data!: Record<string, unknown>[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class ApiSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: 'object', additionalProperties: true })
  data!: unknown;

  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}
