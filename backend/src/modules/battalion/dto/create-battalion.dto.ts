import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateBattalionDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
