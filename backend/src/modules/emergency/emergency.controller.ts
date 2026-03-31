import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmergencyService } from './emergency.service';

@Controller('emergency')
@UseGuards(JwtAuthGuard)
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  // ========================================
  // USER ENDPOINTS
  // ========================================

  /**
   * Get current user's emergency status
   * Returns whether there's an active emergency and if user needs to report
   */
  @Get('status')
  getUserStatus(@Request() req: any) {
    return this.emergencyService.getUserEmergencyStatus(req.user.id);
  }

  /**
   * User reports "I am safe"
   */
  @Post('report-safe')
  reportSafe(@Request() req: any) {
    return this.emergencyService.reportSafe(req.user.id);
  }

  // ========================================
  // ADMIN ENDPOINTS
  // ========================================

  /**
   * Start a new emergency event (ADMIN only)
   */
  @Post('start')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  startEmergency(
    @Request() req: any,
    @Body() body: { title?: string; durationMinutes?: number },
  ) {
    return this.emergencyService.startEmergency(
      req.user.id,
      body.title,
      body.durationMinutes,
    );
  }

  /**
   * Get current active emergency with full stats (ADMIN only)
   */
  @Get('active')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getActiveEmergency() {
    return this.emergencyService.getActiveEmergency();
  }

  /**
   * Get emergency history (ADMIN only)
   */
  @Get('history')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getHistory(@Query('limit') limit?: string) {
    return this.emergencyService.getEmergencyHistory(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * Get specific emergency by ID with full stats (ADMIN only)
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getEmergencyById(@Param('id') id: string) {
    return this.emergencyService.getEmergencyById(id);
  }

  /**
   * Cancel an active emergency (ADMIN only)
   */
  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  cancelEmergency(@Request() req: any, @Param('id') id: string) {
    return this.emergencyService.cancelEmergency(id, req.user.id);
  }
}
