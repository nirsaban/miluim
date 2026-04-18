import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class UpdateBattalionDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
