import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'אימייל הוא שדה חובה' })
  @IsEmail({}, { message: 'כתובת אימייל לא תקינה' })
  email: string;

  @IsNotEmpty({ message: 'קוד אימות הוא שדה חובה' })
  @IsString()
  @Length(6, 6, { message: 'קוד האימות חייב להכיל 6 ספרות' })
  code: string;
}
