import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GeoService } from './geo.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('geo')
@UseGuards(JwtAuthGuard)
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('cities')
  searchCities(@Query('q') query: string) {
    return this.geoService.searchCities(query || '');
  }

  @Get('geocode')
  geocodeCity(@Query('city') cityName: string) {
    return this.geoService.geocodeCity(cityName);
  }
}
