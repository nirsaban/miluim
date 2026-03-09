import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { MilitaryRole } from '@prisma/client';

export class CreatePreapprovedUserDto {
  @IsString()
  @IsNotEmpty({ message: 'מספר אישי הוא שדה חובה' })
  personalId: string;

  @IsString()
  @IsNotEmpty({ message: 'שם מלא הוא שדה חובה' })
  fullName: string;

  @IsEnum(MilitaryRole, { message: 'תפקיד צבאי לא תקין' })
  @IsNotEmpty({ message: 'תפקיד צבאי הוא שדה חובה' })
  militaryRole: MilitaryRole;

  @IsString()
  @IsNotEmpty({ message: 'מחלקה היא שדה חובה' })
  departmentId: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
