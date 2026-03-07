import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

export type UploadCategory = 'shifts' | 'social';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadsDir: string;

  constructor(private configService: ConfigService) {
    this.uploadsDir = this.configService.get('UPLOAD_DIR', './uploads');
    this.ensureUploadDirs();
  }

  private async ensureUploadDirs() {
    const categories: UploadCategory[] = ['shifts', 'social'];
    for (const category of categories) {
      const dir = join(this.uploadsDir, category);
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        this.logger.log(`Created upload directory: ${dir}`);
      }
    }
  }

  async saveFile(
    file: Express.Multer.File,
    category: UploadCategory,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('לא נבחר קובץ');
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('סוג קובץ לא נתמך');
    }

    const maxSize = this.configService.get('MAX_FILE_SIZE', 5242880);
    if (file.size > maxSize) {
      throw new BadRequestException('הקובץ גדול מדי');
    }

    const filename = `${uuidv4()}${extname(file.originalname)}`;
    const categoryDir = join(this.uploadsDir, category);
    const filepath = join(categoryDir, filename);

    try {
      await fs.writeFile(filepath, file.buffer);
      const publicUrl = `/uploads/${category}/${filename}`;
      this.logger.log(`File saved: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error('Failed to save file:', error);
      throw new BadRequestException('שגיאה בשמירת הקובץ');
    }
  }

  async moveFile(
    sourcePath: string,
    category: UploadCategory,
  ): Promise<string> {
    const filename = `${uuidv4()}${extname(sourcePath)}`;
    const categoryDir = join(this.uploadsDir, category);
    const destPath = join(categoryDir, filename);

    try {
      await fs.rename(sourcePath, destPath);
      const publicUrl = `/uploads/${category}/${filename}`;
      this.logger.log(`File moved: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error('Failed to move file:', error);
      throw new BadRequestException('שגיאה בהעברת הקובץ');
    }
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      const filepath = join(process.cwd(), fileUrl);
      await fs.unlink(filepath);
      this.logger.log(`File deleted: ${fileUrl}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to delete file:', error);
      return false;
    }
  }

  getPublicUrl(filename: string, category: UploadCategory): string {
    return `/uploads/${category}/${filename}`;
  }
}
