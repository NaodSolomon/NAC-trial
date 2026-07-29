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

export class CreateDonationDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1_000_000)
  amount!: number;

  @IsIn(['USD', 'ETB'])
  currency!: 'USD' | 'ETB';

  @IsIn(['PAYPAL'])
  gateway!: 'PAYPAL';

  @IsString()
  @MaxLength(100)
  donorName!: string;

  @IsEmail()
  @MaxLength(255)
  donorEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

export class DonationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['INITIATED', 'PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'])
  status?: 'INITIATED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';

  @IsOptional()
  @IsIn(['USD', 'ETB'])
  currency?: 'USD' | 'ETB';

  @IsOptional()
  @IsIn(['PAYPAL', 'TELEBIRR', 'CBE'])
  gateway?: 'PAYPAL' | 'TELEBIRR' | 'CBE';
}
