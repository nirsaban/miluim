import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'אימייל הוא שדה חובה' })
  @IsEmail({}, { message: 'כתובת אימייל לא תקינה' })
  email: string;

  @IsNotEmpty({ message: 'סיסמה היא שדה חובה' })
  @IsString()
  password: string;
}
