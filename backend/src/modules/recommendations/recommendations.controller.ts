import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RecommendationCategory } from '@prisma/client';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  findAll(@Query('category') category?: RecommendationCategory, @Query('limit') limit?: number) {
    if (limit) {
      return this.recommendationsService.findLatest(limit);
    }
    return this.recommendationsService.findAll(category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recommendationsService.findOne(id);
  }

  @Post()
  create(
    @CurrentUser() user: any,
    @Body() body: { content: string; category?: RecommendationCategory },
  ) {
    return this.recommendationsService.create(user.id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.recommendationsService.delete(id, user.id);
  }
}
