import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { WebAuthnService } from './webauthn.service';
import { RegistrationOptionsDto, RegistrationVerificationDto } from './dto/registration.dto';
import { AuthenticationOptionsDto, AuthenticationVerificationDto } from './dto/authentication.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('auth/webauthn')
export class WebAuthnController {
  constructor(private readonly webAuthnService: WebAuthnService) {}

  /**
   * Check passkey status for current user
   * Returns whether user has enrolled passkeys and their list
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getPasskeyStatus(@Req() req: Request & { user: { id: string } }) {
    return this.webAuthnService.checkPasskeyStatus(req.user.id);
  }

  /**
   * Generate registration options for passkey enrollment
   * Requires authenticated user
   */
  @Post('register/options')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getRegistrationOptions(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: RegistrationOptionsDto,
  ) {
    return this.webAuthnService.generateRegistrationOptions(req.user.id, dto.deviceName);
  }

  /**
   * Verify passkey registration and store credential
   * Requires authenticated user
   */
  @Post('register/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async verifyRegistration(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: RegistrationVerificationDto,
  ) {
    return this.webAuthnService.verifyRegistration(
      req.user.id,
      {
        id: dto.id,
        rawId: dto.rawId,
        type: dto.type as 'public-key',
        response: {
          clientDataJSON: dto.response.clientDataJSON,
          attestationObject: dto.response.attestationObject,
          transports: dto.response.transports as any,
          publicKeyAlgorithm: dto.response.publicKeyAlgorithm,
          publicKey: dto.response.publicKey,
          authenticatorData: dto.response.authenticatorData,
        },
        authenticatorAttachment: dto.authenticatorAttachment as any,
        clientExtensionResults: dto.clientExtensionResults || {},
      },
      dto.deviceName,
    );
  }

  /**
   * Generate authentication options for passkey login
   * Public endpoint - does not require authentication
   */
  @Public()
  @Post('authenticate/options')
  @HttpCode(HttpStatus.OK)
  async getAuthenticationOptions(@Body() dto: AuthenticationOptionsDto) {
    return this.webAuthnService.generateAuthenticationOptions(dto.personalId);
  }

  /**
   * Verify passkey authentication and issue JWT token
   * Public endpoint - this IS the login mechanism
   */
  @Public()
  @Post('authenticate/verify')
  @HttpCode(HttpStatus.OK)
  async verifyAuthentication(@Body() dto: AuthenticationVerificationDto) {
    return this.webAuthnService.verifyAuthentication({
      id: dto.id,
      rawId: dto.rawId,
      type: dto.type as 'public-key',
      response: {
        clientDataJSON: dto.response.clientDataJSON,
        authenticatorData: dto.response.authenticatorData,
        signature: dto.response.signature,
        userHandle: dto.response.userHandle,
      },
      authenticatorAttachment: dto.authenticatorAttachment as any,
      clientExtensionResults: dto.clientExtensionResults || {},
    });
  }

  /**
   * Delete a specific passkey credential
   * Requires authenticated user
   */
  @Delete('credentials/:credentialId')
  @UseGuards(JwtAuthGuard)
  async deleteCredential(
    @Req() req: Request & { user: { id: string } },
    @Param('credentialId') credentialId: string,
  ) {
    return this.webAuthnService.deleteCredential(req.user.id, credentialId);
  }
}
