import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDonationDto {
  @ApiProperty({ example: 25, minimum: 1, maximum: 1_000_000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1_000_000)
  amount!: number;

  @ApiProperty({ enum: ['USD', 'ETB'], example: 'USD' })
  @IsIn(['USD', 'ETB'])
  currency!: 'USD' | 'ETB';

  @ApiProperty({
    enum: ['PAYPAL'],
    example: 'PAYPAL',
    description: 'Compatibility label; trial mode uses the fake gateway and collects no money.',
  })
  @IsIn(['PAYPAL'])
  gateway!: 'PAYPAL';

  @ApiProperty({ example: 'Trial Donor', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  donorName!: string;

  @ApiProperty({ example: 'donor@example.com', format: 'email' })
  @IsEmail()
  @MaxLength(255)
  donorEmail!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

export class DonationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['INITIATED', 'PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'] })
  @IsOptional()
  @IsIn(['INITIATED', 'PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'])
  status?: 'INITIATED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';

  @ApiPropertyOptional({ enum: ['USD', 'ETB'] })
  @IsOptional()
  @IsIn(['USD', 'ETB'])
  currency?: 'USD' | 'ETB';

  @ApiPropertyOptional({ enum: ['PAYPAL', 'TELEBIRR', 'CBE'] })
  @IsOptional()
  @IsIn(['PAYPAL', 'TELEBIRR', 'CBE'])
  gateway?: 'PAYPAL' | 'TELEBIRR' | 'CBE';
}
