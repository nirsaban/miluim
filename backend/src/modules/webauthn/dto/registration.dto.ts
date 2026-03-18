import { IsString, IsOptional, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// DTO for registration options request
export class RegistrationOptionsDto {
  @IsOptional()
  @IsString()
  deviceName?: string;
}

// Authenticator response for registration
class AuthenticatorAttestationResponseDto {
  @IsString()
  clientDataJSON: string;

  @IsString()
  attestationObject: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transports?: string[];

  @IsOptional()
  @IsNumber()
  publicKeyAlgorithm?: number;

  @IsOptional()
  @IsString()
  publicKey?: string;

  @IsOptional()
  @IsString()
  authenticatorData?: string;
}

// DTO for registration verification
export class RegistrationVerificationDto {
  @IsString()
  id: string;

  @IsString()
  rawId: string;

  @IsString()
  type: string;

  @ValidateNested()
  @Type(() => AuthenticatorAttestationResponseDto)
  response: AuthenticatorAttestationResponseDto;

  @IsOptional()
  @IsString()
  authenticatorAttachment?: string;

  @IsOptional()
  clientExtensionResults?: any;

  @IsOptional()
  @IsString()
  deviceName?: string;
}
