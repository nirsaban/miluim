import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CheckPersonalIdDto } from './dto/check-personalid.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Check if personalId exists and is eligible for registration
   */
  async checkPersonalId(dto: CheckPersonalIdDto) {
    const user = await this.prisma.user.findUnique({
      where: { personalId: dto.personalId },
      include: {
        department: true,
      },
    });

    if (!user) {
      throw new BadRequestException('מספר אישי לא נמצא במערכת. יש לפנות למפקד הפלוגה');
    }

    if (user.isRegistered) {
      throw new ConflictException('המשתמש כבר השלים הרשמה. יש להתחבר');
    }

    if (!user.isPreApproved) {
      throw new ForbiddenException('המשתמש לא אושר מראש. יש לפנות למפקד');
    }

    return {
      success: true,
      message: 'מספר אישי אומת בהצלחה',
      user: {
        personalId: user.personalId,
        fullName: user.fullName || '',
        militaryRole: user.militaryRole,
        department: user.department
          ? {
              id: user.department.id,
              name: user.department.name,
              code: user.department.code,
            }
          : null,
      },
    };
  }

  /**
   * Complete registration for pre-approved user
   */
  async register(dto: RegisterDto) {
    // Check if user exists and is pre-approved
    const existingUser = await this.prisma.user.findUnique({
      where: { personalId: dto.personalId },
    });

    if (!existingUser) {
      throw new BadRequestException('מספר אישי לא נמצא במערכת');
    }

    if (existingUser.isRegistered) {
      throw new ConflictException('המשתמש כבר השלים הרשמה');
    }

    if (!existingUser.isPreApproved) {
      throw new ForbiddenException('המשתמש לא אושר מראש');
    }

    // Check if email or idNumber already taken by another user
    const conflictUser = await this.prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: existingUser.id } },
          {
            OR: [{ email: dto.email }, { idNumber: dto.idNumber }],
          },
        ],
      },
    });

    if (conflictUser) {
      if (conflictUser.email === dto.email) {
        throw new ConflictException('כתובת האימייל כבר קיימת במערכת');
      }
      if (conflictUser.idNumber === dto.idNumber) {
        throw new ConflictException('תעודת הזהות כבר קיימת במערכת');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Update user with registration details
    const user = await this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        idNumber: dto.idNumber,
        dailyJob: dto.dailyJob,
        city: dto.city,
        fieldOfStudy: dto.fieldOfStudy,
        birthDay: dto.birthDay ? new Date(dto.birthDay) : null,
        isRegistered: true,
        armyNumber: dto.personalId, // Keep for backward compatibility
        departmentId: dto.departmentId || existingUser.departmentId,
        skills: dto.skillIds?.length
          ? {
              create: dto.skillIds.map((skillId) => ({
                skillId,
              })),
            }
          : undefined,
      },
    });

    this.logger.log(`User completed registration: ${user.personalId}`);

    return {
      success: true,
      message: 'ההרשמה הושלמה בהצלחה',
      userId: user.id,
    };
  }

  /**
   * Login with personalId and password
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { personalId: dto.personalId },
      include: {
        department: true,
        webAuthnCredentials: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('מספר אישי או סיסמה שגויים');
    }

    if (!user.isRegistered) {
      throw new UnauthorizedException('יש להשלים את ההרשמה תחילה');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('החשבון אינו פעיל');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('מספר אישי או סיסמה שגויים');
    }

    const payload = {
      sub: user.id,
      personalId: user.personalId,
      email: user.email,
      role: user.role,
      militaryRole: user.militaryRole,
      departmentId: user.departmentId,
    };

    const token = this.jwtService.sign(payload);

    this.logger.log(`User authenticated: ${user.personalId}`);

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
        hasPasskey: user.webAuthnCredentials.length > 0,
      },
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        personalId: true,
        email: true,
        fullName: true,
        role: true,
        militaryRole: true,
        departmentId: true,
        phone: true,
        isActive: true,
        isRegistered: true,
      },
    });
  }
}
