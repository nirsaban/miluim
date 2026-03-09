import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CsvImportService, CsvRow, PreviewResult, ImportResult } from './csv-import.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('csv-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CsvImportController {
  constructor(private readonly csvImportService: CsvImportService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  async preview(@UploadedFile() file: Express.Multer.File): Promise<PreviewResult> {
    if (!file) {
      throw new BadRequestException('לא הועלה קובץ');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('נא להעלות קובץ CSV');
    }

    return this.csvImportService.previewCsv(file.buffer);
  }

  @Post('import')
  async importUsers(@Body() body: { rows: CsvRow[] }): Promise<ImportResult> {
    if (!body.rows || body.rows.length === 0) {
      throw new BadRequestException('אין שורות לייבוא');
    }

    return this.csvImportService.importUsers(body.rows);
  }

  @Get('sample')
  getSample() {
    return {
      csv: this.csvImportService.getSampleCsv(),
      columns: [
        { name: 'personalId', description: 'מספר אישי', required: true },
        { name: 'fullName', description: 'שם מלא', required: true },
        { name: 'militaryRole', description: 'תפקיד צבאי (לוחם/מפקד/סמ״פ וכו׳)', required: true },
        { name: 'departmentCode', description: 'קוד מחלקה (1/2/3)', required: true },
        { name: 'phone', description: 'טלפון', required: false },
      ],
    };
  }
}
