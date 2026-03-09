import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'מספר אישי הוא שדה חובה' })
  @IsString()
  personalId: string;

  @IsNotEmpty({ message: 'סיסמה היא שדה חובה' })
  @IsString()
  password: string;
}
