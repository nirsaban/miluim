import { IsString, IsEmail, MinLength } from 'class-validator';

export class CreateCompanyAdminDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  personalId: string;

  @IsString()
  idNumber: string;

  @IsString()
  @MinLength(6)
  temporaryPassword: string;
}
