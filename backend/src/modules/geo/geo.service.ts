import { Injectable, Logger } from '@nestjs/common';

export interface IsraelCity {
  name: string;
  englishName: string;
}

export interface GeocodedCity {
  name: string;
  lat: number;
  lng: number;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private citiesCache: IsraelCity[] = [];
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Search Israel cities from data.gov.il API
   */
  async searchCities(query: string): Promise<IsraelCity[]> {
    const cities = await this.getAllCities();

    if (!query || query.length < 1) {
      return cities.slice(0, 50);
    }

    const q = query.trim();
    return cities
      .filter(
        (c) =>
          c.name.includes(q) ||
          c.englishName.toLowerCase().includes(q.toLowerCase()),
      )
      .slice(0, 30);
  }

  /**
   * Geocode a city name to lat/lng using Nominatim
   */
  async geocodeCity(cityName: string): Promise<GeocodedCity | null> {
    try {
      const encoded = encodeURIComponent(`${cityName}, Israel`);
      const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=il`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'YogevMilitary/1.0' },
      });

      if (!response.ok) return null;

      const results = await response.json();
      if (results.length === 0) return null;

      return {
        name: cityName,
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
      };
    } catch (error) {
      this.logger.error(`Geocoding failed for ${cityName}:`, error);
      return null;
    }
  }

  /**
   * Fetch and cache all Israel cities from data.gov.il
   */
  private async getAllCities(): Promise<IsraelCity[]> {
    if (
      this.citiesCache.length > 0 &&
      Date.now() - this.cacheTimestamp < this.CACHE_TTL
    ) {
      return this.citiesCache;
    }

    try {
      const url =
        'https://data.gov.il/api/3/action/datastore_search?resource_id=d4901968-dad3-4845-a9b0-a57d027f11ab&limit=1500';
      const response = await fetch(url);

      if (!response.ok) {
        this.logger.error(`data.gov.il API returned ${response.status}`);
        return this.citiesCache;
      }

      const data = await response.json();
      const records = data.result?.records || [];

      this.citiesCache = records
        .map((r: any) => ({
          name: (r['שם_ישוב'] || '').trim(),
          englishName: (r['שם_ישוב_לועזי'] || '').trim(),
        }))
        .filter((c: IsraelCity) => c.name.length > 0)
        .sort((a: IsraelCity, b: IsraelCity) => a.name.localeCompare(b.name, 'he'));

      this.cacheTimestamp = Date.now();
      this.logger.log(`Cached ${this.citiesCache.length} Israel cities`);

      return this.citiesCache;
    } catch (error) {
      this.logger.error('Failed to fetch cities:', error);
      return this.citiesCache;
    }
  }
}
