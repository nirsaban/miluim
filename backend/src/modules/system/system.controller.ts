import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SystemService, TableInfo, ColumnInfo } from './system.service';

@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_TECHNICAL)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  /**
   * Get list of all database tables
   */
  @Get('tables')
  async getTables(): Promise<TableInfo[]> {
    return this.systemService.getTables();
  }

  /**
   * Get schema (columns) for a specific table
   */
  @Get('tables/:table/schema')
  async getTableSchema(@Param('table') table: string): Promise<ColumnInfo[]> {
    return this.systemService.getTableSchema(table);
  }

  /**
   * Get all data from a table with pagination
   */
  @Get('tables/:table/data')
  async getTableData(
    @Param('table') table: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('orderBy') orderBy?: string,
    @Query('orderDir') orderDir?: 'asc' | 'desc',
  ) {
    return this.systemService.getTableData(
      table,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      orderBy,
      orderDir || 'desc',
    );
  }

  /**
   * Get single record by ID
   */
  @Get('tables/:table/data/:id')
  async getRecord(
    @Param('table') table: string,
    @Param('id') id: string,
  ) {
    return this.systemService.getRecord(table, id);
  }

  /**
   * Create a new record
   */
  @Post('tables/:table/data')
  async createRecord(
    @Param('table') table: string,
    @Body() data: Record<string, any>,
  ) {
    return this.systemService.createRecord(table, data);
  }

  /**
   * Update a record
   */
  @Patch('tables/:table/data/:id')
  async updateRecord(
    @Param('table') table: string,
    @Param('id') id: string,
    @Body() data: Record<string, any>,
  ) {
    return this.systemService.updateRecord(table, id, data);
  }

  /**
   * Delete a record
   */
  @Delete('tables/:table/data/:id')
  async deleteRecord(
    @Param('table') table: string,
    @Param('id') id: string,
  ) {
    return this.systemService.deleteRecord(table, id);
  }
}
