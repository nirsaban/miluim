import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
  IsDateString,
  IsArray,
  IsUUID,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'מספר אישי הוא שדה חובה' })
  @IsString()
  personalId: string;

  @IsNotEmpty({ message: 'שם מלא הוא שדה חובה' })
  @IsString()
  fullName: string;

  @IsNotEmpty({ message: 'טלפון הוא שדה חובה' })
  @IsString()
  @Matches(/^05\d{8}$/, { message: 'מספר טלפון לא תקין' })
  phone: string;

  @IsNotEmpty({ message: 'אימייל הוא שדה חובה' })
  @IsEmail({}, { message: 'כתובת אימייל לא תקינה' })
  email: string;

  @IsNotEmpty({ message: 'סיסמה היא שדה חובה' })
  @MinLength(8, { message: 'הסיסמה חייבת להכיל לפחות 8 תווים' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'הסיסמה חייבת להכיל אותיות גדולות, קטנות ומספרים',
  })
  password: string;

  @IsNotEmpty({ message: 'תעודת זהות היא שדה חובה' })
  @IsString()
  @Matches(/^\d{9}$/, { message: 'מספר תעודת זהות לא תקין' })
  idNumber: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  skillIds?: string[];

  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @IsOptional()
  @IsString()
  dailyJob?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  fieldOfStudy?: string;

  @IsOptional()
  @IsDateString()
  birthDay?: string;
}
