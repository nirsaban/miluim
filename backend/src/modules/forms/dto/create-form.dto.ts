import { IsNotEmpty, IsEnum, IsObject } from 'class-validator';
import { FormType } from '@prisma/client';

export class CreateFormDto {
  @IsNotEmpty({ message: 'סוג הטופס הוא שדה חובה' })
  @IsEnum(FormType, { message: 'סוג טופס לא תקין' })
  type: FormType;

  @IsNotEmpty({ message: 'תוכן הטופס הוא שדה חובה' })
  @IsObject()
  content: Record<string, any>;
}
