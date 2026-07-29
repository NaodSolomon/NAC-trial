import { IsEmail, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AdminRole } from '../../auth/interfaces/auth.types';

const ADMIN_ROLES: AdminRole[] = ['SUPER_ADMIN', 'CONTENT_EDITOR', 'FINANCE_VIEWER'];

export class CreateAdminDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'password must include uppercase, lowercase, and numeric characters',
  })
  password: string;

  @IsIn(ADMIN_ROLES)
  role: AdminRole;
}
