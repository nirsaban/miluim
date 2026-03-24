import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SocialActivitiesService } from './social-activities.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('social-activities')
@UseGuards(JwtAuthGuard)
export class SocialActivitiesController {
  constructor(private readonly socialActivitiesService: SocialActivitiesService) {}

  /**
   * Get all active social activities
   */
  @Get()
  findAll() {
    return this.socialActivitiesService.findAll();
  }

  /**
   * Get user's activities (created + joined)
   */
  @Get('my')
  getMyActivities(@CurrentUser() user: any) {
    return this.socialActivitiesService.getMyActivities(user.id);
  }

  /**
   * Get a single activity by ID
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.socialActivitiesService.findOne(id);
  }

  /**
   * Create a new social activity
   */
  @Post()
  create(
    @CurrentUser() user: any,
    @Body() body: {
      title: string;
      description?: string;
      place: string;
      startTime: string;
      endTime?: string;
      maxParticipants?: number;
    },
  ) {
    return this.socialActivitiesService.create(
      {
        title: body.title,
        description: body.description,
        place: body.place,
        startTime: new Date(body.startTime),
        endTime: body.endTime ? new Date(body.endTime) : undefined,
        maxParticipants: body.maxParticipants,
      },
      user.id,
    );
  }

  /**
   * Join an activity
   */
  @Post(':id/join')
  join(@Param('id') id: string, @CurrentUser() user: any) {
    return this.socialActivitiesService.join(id, user.id);
  }

  /**
   * Confirm arrival to activity
   */
  @Post(':id/confirm')
  confirmArrival(@Param('id') id: string, @CurrentUser() user: any) {
    return this.socialActivitiesService.confirmArrival(id, user.id);
  }

  /**
   * Leave an activity
   */
  @Post(':id/leave')
  leave(@Param('id') id: string, @CurrentUser() user: any) {
    return this.socialActivitiesService.leave(id, user.id);
  }

  /**
   * Cancel an activity (creator only)
   */
  @Delete(':id')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.socialActivitiesService.cancel(id, user.id);
  }

  /**
   * Trigger reminder check (could be called by cron)
   */
  @Post('reminders/send')
  sendReminders() {
    return this.socialActivitiesService.sendReminders();
  }
}
