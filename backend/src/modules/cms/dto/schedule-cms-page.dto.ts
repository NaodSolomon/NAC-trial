import { IsDateString } from 'class-validator';

export class ScheduleCmsPageDto {
  @IsDateString()
  scheduledAt: string;
}
