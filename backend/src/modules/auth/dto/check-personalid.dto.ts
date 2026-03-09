import { IsNotEmpty, IsString } from 'class-validator';

export class CheckPersonalIdDto {
  @IsNotEmpty({ message: 'מספר אישי הוא שדה חובה' })
  @IsString()
  personalId: string;
}
