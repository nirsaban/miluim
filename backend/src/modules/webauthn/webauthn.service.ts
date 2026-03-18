import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialDescriptorJSON,
} from '@simplewebauthn/server';

@Injectable()
export class WebAuthnService {
  private readonly logger = new Logger(WebAuthnService.name);
  private readonly rpName: string;
  private readonly rpId: string;
  private readonly origin: string;
  private readonly challengeTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    // Configure relying party settings from environment
    this.rpName = this.configService.get('WEBAUTHN_RP_NAME', 'מערכת ניהול - פלוגת יוגב');
    this.rpId = this.configService.get('WEBAUTHN_RP_ID', 'localhost');
    this.origin = this.configService.get('WEBAUTHN_ORIGIN', 'localhost');
  }

  /**
   * Check if WebAuthn/Passkeys are available for registration
   */
  async checkPasskeyStatus(userId: string) {
    const credentials = await this.prisma.webAuthnCredential.findMany({
      where: { userId },
      select: {
        id: true,
        deviceName: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    return {
      hasPasskey: credentials.length > 0,
      credentials: credentials.map(c => ({
        id: c.id,
        deviceName: c.deviceName || 'מכשיר לא ידוע',
        createdAt: c.createdAt,
        lastUsedAt: c.lastUsedAt,
      })),
    };
  }

  /**
   * Generate registration options for WebAuthn credential creation
   */
  async generateRegistrationOptions(userId: string, deviceName?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { webAuthnCredentials: true },
    });

    if (!user) {
      throw new BadRequestException('המשתמש לא נמצא');
    }

    // Get existing credentials to exclude (as base64url strings)
    const excludeCredentials: PublicKeyCredentialDescriptorJSON[] = user.webAuthnCredentials.map(cred => ({
      id: cred.credentialId, // Already base64url encoded
      type: 'public-key' as const,
      transports: cred.transports as AuthenticatorTransportFuture[],
    }));

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userID: Buffer.from(user.id),
      userName: user.personalId,
      userDisplayName: user.fullName,
      attestationType: 'none', // We don't need attestation verification
      excludeCredentials,
      authenticatorSelection: {
        // Prefer platform authenticators (Face ID, Touch ID, Windows Hello)
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
    });

    // Store challenge for verification
    await this.storeChallenge(options.challenge, userId, 'registration');

    this.logger.log(`Generated registration options for user: ${user.personalId}`);

    return {
      success: true,
      options,
      deviceName,
    };
  }

  /**
   * Verify registration response and store credential
   */
  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    deviceName?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('המשתמש לא נמצא');
    }

    // Retrieve and validate challenge
    const challenge = await this.getAndValidateChallenge(userId, 'registration');

    try {
      const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpId,
        requireUserVerification: true,
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new BadRequestException('אימות הרישום נכשל');
      }

      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      // Store the credential - credential.id is already a base64url string
      // credential.publicKey is a Uint8Array that needs encoding
      const credentialIdBase64url = credential.id; // Already base64url encoded
      const publicKeyBase64url = Buffer.from(credential.publicKey).toString('base64url');

      await this.prisma.webAuthnCredential.create({
        data: {
          userId,
          credentialId: credentialIdBase64url,
          publicKey: publicKeyBase64url,
          counter: BigInt(credential.counter),
          transports: response.response.transports || [],
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          deviceName: deviceName || this.getDefaultDeviceName(response),
        },
      });

      // Clean up used challenge
      await this.deleteChallenge(challenge);

      this.logger.log(`Passkey registered successfully for user: ${user.personalId}`);

      return {
        success: true,
        message: 'מפתח הגישה נרשם בהצלחה',
        verified: true,
      };
    } catch (error) {
      this.logger.error(`Registration verification failed: ${error.message}`);
      throw new BadRequestException('אימות הרישום נכשל: ' + error.message);
    }
  }

  /**
   * Generate authentication options for WebAuthn credential verification
   */
  async generateAuthenticationOptions(personalId?: string) {
    let allowCredentials: PublicKeyCredentialDescriptorJSON[] | undefined = undefined;
    let userId: string | null = null;

    if (personalId) {
      // User-specific authentication
      const user = await this.prisma.user.findUnique({
        where: { personalId },
        include: { webAuthnCredentials: true },
      });

      if (!user) {
        throw new BadRequestException('המשתמש לא נמצא');
      }

      if (user.webAuthnCredentials.length === 0) {
        throw new BadRequestException('למשתמש אין מפתח גישה רשום');
      }

      userId = user.id;
      allowCredentials = user.webAuthnCredentials.map(cred => ({
        id: cred.credentialId, // Already base64url encoded
        type: 'public-key' as const,
        transports: cred.transports as AuthenticatorTransportFuture[],
      }));
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      allowCredentials,
      userVerification: 'required',
    });

    // Store challenge for verification
    await this.storeChallenge(options.challenge, userId, 'authentication');

    this.logger.log(`Generated authentication options${personalId ? ` for user: ${personalId}` : ''}`);

    return {
      success: true,
      options,
    };
  }

  /**
   * Verify authentication response and issue JWT token
   */
  async verifyAuthentication(response: AuthenticationResponseJSON) {
    // Find the credential by ID - response.id is already base64url encoded
    const credentialId = response.id;

    this.logger.log(`Looking for credential ID: ${credentialId}`);

    const storedCredential = await this.prisma.webAuthnCredential.findUnique({
      where: { credentialId },
      include: {
        user: {
          include: { department: true },
        },
      },
    });

    if (!storedCredential) {
      // Log all stored credentials for debugging
      const allCreds = await this.prisma.webAuthnCredential.findMany({ select: { credentialId: true } });
      this.logger.error(`Credential not found. Looking for: ${credentialId}`);
      this.logger.error(`Stored credentials: ${JSON.stringify(allCreds.map(c => c.credentialId))}`);
      throw new UnauthorizedException('מפתח גישה לא נמצא');
    }

    const user = storedCredential.user;

    if (!user.isActive) {
      throw new UnauthorizedException('החשבון אינו פעיל');
    }

    // Retrieve and validate challenge
    const challenge = await this.getAuthenticationChallenge();

    try {
      const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpId,
        credential: {
          id: storedCredential.credentialId, // base64url string
          publicKey: Buffer.from(storedCredential.publicKey, 'base64url'),
          counter: Number(storedCredential.counter),
          transports: storedCredential.transports as AuthenticatorTransportFuture[],
        },
        requireUserVerification: true,
      });

      if (!verification.verified) {
        throw new UnauthorizedException('אימות מפתח הגישה נכשל');
      }

      // Update credential counter for replay protection
      await this.prisma.webAuthnCredential.update({
        where: { id: storedCredential.id },
        data: {
          counter: BigInt(verification.authenticationInfo.newCounter),
          lastUsedAt: new Date(),
        },
      });

      // Clean up used challenge
      await this.deleteChallenge(challenge);

      // Generate JWT token
      const payload = {
        sub: user.id,
        personalId: user.personalId,
        email: user.email,
        role: user.role,
        militaryRole: user.militaryRole,
        departmentId: user.departmentId,
      };

      const token = this.jwtService.sign(payload);

      this.logger.log(`User authenticated via passkey: ${user.personalId}`);

      return {
        success: true,
        message: 'התחברת בהצלחה',
        token,
        user: {
          id: user.id,
          personalId: user.personalId,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          militaryRole: user.militaryRole,
          department: user.department,
          hasPasskey: true,
        },
      };
    } catch (error) {
      this.logger.error(`Authentication verification failed: ${error.message}`);
      throw new UnauthorizedException('אימות מפתח הגישה נכשל: ' + error.message);
    }
  }

  /**
   * Delete a specific passkey credential
   */
  async deleteCredential(userId: string, credentialId: string) {
    const credential = await this.prisma.webAuthnCredential.findFirst({
      where: {
        id: credentialId,
        userId,
      },
    });

    if (!credential) {
      throw new BadRequestException('מפתח הגישה לא נמצא');
    }

    await this.prisma.webAuthnCredential.delete({
      where: { id: credentialId },
    });

    this.logger.log(`Passkey deleted for user: ${userId}`);

    return {
      success: true,
      message: 'מפתח הגישה נמחק בהצלחה',
    };
  }

  // Private helper methods

  private async storeChallenge(challenge: string, userId: string | null, type: string) {
    // Clean up expired challenges first
    await this.prisma.webAuthnChallenge.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    await this.prisma.webAuthnChallenge.create({
      data: {
        challenge,
        userId,
        type,
        expiresAt: new Date(Date.now() + this.challengeTimeout),
      },
    });
  }

  private async getAndValidateChallenge(userId: string, type: string): Promise<string> {
    const challengeRecord = await this.prisma.webAuthnChallenge.findFirst({
      where: {
        userId,
        type,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challengeRecord) {
      throw new BadRequestException('האתגר פג תוקף או לא נמצא');
    }

    return challengeRecord.challenge;
  }

  private async getAuthenticationChallenge(): Promise<string> {
    // For authentication, we get the most recent unexpired challenge
    const challengeRecord = await this.prisma.webAuthnChallenge.findFirst({
      where: {
        type: 'authentication',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challengeRecord) {
      throw new BadRequestException('האתגר פג תוקף או לא נמצא');
    }

    return challengeRecord.challenge;
  }

  private async deleteChallenge(challenge: string) {
    await this.prisma.webAuthnChallenge.deleteMany({
      where: { challenge },
    });
  }

  private getDefaultDeviceName(response: RegistrationResponseJSON): string {
    // Try to determine device type from authenticator attachment
    if (response.authenticatorAttachment === 'platform') {
      return 'מכשיר נוכחי';
    }
    return 'מפתח גישה';
  }
}
