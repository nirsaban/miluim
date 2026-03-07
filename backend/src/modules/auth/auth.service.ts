import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { armyNumber: dto.armyNumber },
          { idNumber: dto.idNumber },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === dto.email) {
        throw new ConflictException('כתובת האימייל כבר קיימת במערכת');
      }
      if (existingUser.armyNumber === dto.armyNumber) {
        throw new ConflictException('המספר האישי כבר קיים במערכת');
      }
      if (existingUser.idNumber === dto.idNumber) {
        throw new ConflictException('תעודת הזהות כבר קיימת במערכת');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        armyNumber: dto.armyNumber,
        idNumber: dto.idNumber,
        role: dto.role || 'SOLDIER',
        dailyJob: dto.dailyJob,
        city: dto.city,
        fieldOfStudy: dto.fieldOfStudy,
        birthDay: dto.birthDay ? new Date(dto.birthDay) : null,
        skills: dto.skillIds?.length
          ? {
              create: dto.skillIds.map((skillId) => ({
                skillId,
              })),
            }
          : undefined,
      },
    });

    this.logger.log(`User registered: ${user.email}`);

    return {
      success: true,
      message: 'ההרשמה בוצעה בהצלחה',
      userId: user.id,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('אימייל או סיסמה שגויים');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('החשבון אינו פעיל');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('אימייל או סיסמה שגויים');
    }

    const otpCode = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.oTP.deleteMany({
      where: { email: dto.email },
    });

    await this.prisma.oTP.create({
      data: {
        email: dto.email,
        code: otpCode,
        expiresAt,
      },
    });

    await this.emailService.sendOTP(dto.email, otpCode);

    this.logger.log(`OTP sent to: ${dto.email}`);

    return {
      success: true,
      message: 'קוד אימות נשלח למייל שלך',
      email: dto.email,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otp = await this.prisma.oTP.findFirst({
      where: {
        email: dto.email,
        code: dto.code,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otp) {
      throw new BadRequestException('קוד האימות שגוי או פג תוקף');
    }

    await this.prisma.oTP.update({
      where: { id: otp.id },
      data: { used: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('משתמש לא נמצא');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    this.logger.log(`User authenticated: ${user.email}`);

    return {
      success: true,
      message: 'התחברת בהצלחה',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('משתמש לא נמצא');
    }

    const otpCode = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.oTP.deleteMany({
      where: { email },
    });

    await this.prisma.oTP.create({
      data: {
        email,
        code: otpCode,
        expiresAt,
      },
    });

    await this.emailService.sendOTP(email, otpCode);

    return {
      success: true,
      message: 'קוד אימות חדש נשלח',
    };
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        armyNumber: true,
        isActive: true,
      },
    });
  }
}
