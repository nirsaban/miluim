import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// DTO for authentication options request
export class AuthenticationOptionsDto {
  @IsOptional()
  @IsString()
  personalId?: string; // Optional - for identifying the user before auth
}

// Authenticator response for authentication
class AuthenticatorAssertionResponseDto {
  @IsString()
  clientDataJSON: string;

  @IsString()
  authenticatorData: string;

  @IsString()
  signature: string;

  @IsOptional()
  @IsString()
  userHandle?: string;
}

// DTO for authentication verification
export class AuthenticationVerificationDto {
  @IsString()
  id: string;

  @IsString()
  rawId: string;

  @IsString()
  type: string;

  @ValidateNested()
  @Type(() => AuthenticatorAssertionResponseDto)
  response: AuthenticatorAssertionResponseDto;

  @IsOptional()
  @IsString()
  authenticatorAttachment?: string;

  @IsOptional()
  clientExtensionResults?: any;
}
