import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsOptional()
  battalionId?: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(1)
  code: string;

  @IsString()
  @IsOptional()
  description?: string;
}
