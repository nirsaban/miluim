import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { CompanyScopeService, CompanyScopedUser } from '../../common/services/company-scope.service';

@Injectable()
export class ShiftReportsService {
  constructor(
    private prisma: PrismaService,
    private companyScopeService: CompanyScopeService,
  ) {}

  async create(userId: string, data: {
    shiftAssignmentId: string;
    reportTitle?: string;
    reportDate?: Date;
    reportTime?: string;
    forceComposition?: string;
    vehicleNumber?: string;
    content: string;
    meansUsed?: string;
    closingResult?: string;
    eventNumber?: string;
  }) {
    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id: data.shiftAssignmentId },
      include: { task: true }
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const formattedSummary = this.formatReportSummary({
      ...data,
      reportDate: data.reportDate || new Date(),
    });

    return this.prisma.shiftReport.create({
      data: {
        userId,
        shiftAssignmentId: data.shiftAssignmentId,
        taskId: assignment.taskId,
        zoneId: assignment.task.zoneId,
        shiftTemplateId: assignment.shiftTemplateId,
        reportTitle: data.reportTitle || 'סיכום אירוע',
        reportDate: data.reportDate || new Date(),
        reportTime: data.reportTime,
        forceComposition: data.forceComposition,
        vehicleNumber: data.vehicleNumber,
        content: data.content,
        meansUsed: data.meansUsed,
        closingResult: data.closingResult,
        eventNumber: data.eventNumber,
        formattedSummary,
      },
    });
  }

  async findAll(filters: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    taskId?: string;
    zoneId?: string;
    eventNumber?: string;
  }, user?: CompanyScopedUser) {
    const companyFilter = user ? this.companyScopeService.getCompanyFilter(user) : {};
    const where: any = {
      ...(companyFilter.companyId && {
        shiftAssignment: { soldier: { companyId: companyFilter.companyId } },
      }),
    };

    if (filters.startDate || filters.endDate) {
      where.reportDate = {};
      if (filters.startDate) where.reportDate.gte = filters.startDate;
      if (filters.endDate) where.reportDate.lte = filters.endDate;
    }

    if (filters.userId) where.userId = filters.userId;
    if (filters.taskId) where.taskId = filters.taskId;
    if (filters.zoneId) where.zoneId = filters.zoneId;
    if (filters.eventNumber) where.eventNumber = { contains: filters.eventNumber };

    return this.prisma.shiftReport.findMany({
      where,
      include: {
        user: { select: { fullName: true, personalId: true } },
        shiftAssignment: {
          include: {
            task: true,
            shiftTemplate: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const report = await this.prisma.shiftReport.findUnique({
      where: { id },
      include: {
        user: { select: { fullName: true, personalId: true } },
        shiftAssignment: {
          include: {
            task: true,
            shiftTemplate: true,
          }
        }
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async findByAssignment(assignmentId: string) {
    return this.prisma.shiftReport.findMany({
      where: { shiftAssignmentId: assignmentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private formatReportSummary(data: any): string {
    const dateStr = format(data.reportDate, 'dd/MM/yyyy');
    let summary = `${data.reportTitle || 'סיכום אירוע'}\n`;
    summary += `תאריך: ${dateStr}\n`;
    if (data.reportTime) summary += `שעה: ${data.reportTime}\n`;
    if (data.forceComposition) summary += `סד״כ: ${data.forceComposition}\n`;
    if (data.vehicleNumber) summary += `רכב מספר ${data.vehicleNumber}\n`;
    
    summary += `\nתוכן:\n${data.content}\n\n`;
    
    if (data.meansUsed) summary += `שימוש באמצעים: ${data.meansUsed}\n`;
    if (data.closingResult) summary += `סיום: ${data.closingResult}\n`;
    if (data.eventNumber) summary += `מספר אירוע - ${data.eventNumber}\n`;
    
    return summary;
  }

  async generateDocx(id: string) {
    const report = await this.findOne(id);
    
    const dateStr = format(report.reportDate, 'dd/MM/yyyy');
    
    const doc = new Document({
      sections: [{
        properties: {
          // DOCX RTL is done via bidi property on paragraphs
        },
        children: [
          new Paragraph({
            text: report.reportTitle,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `תאריך: `, bold: true }),
              new TextRun(dateStr),
            ],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
          }),
          ...(report.reportTime ? [
            new Paragraph({
              children: [
                new TextRun({ text: `שעה: `, bold: true }),
                new TextRun(report.reportTime),
              ],
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
            })
          ] : []),
          ...(report.forceComposition ? [
            new Paragraph({
              children: [
                new TextRun({ text: `סד״כ: `, bold: true }),
                new TextRun(report.forceComposition),
              ],
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
            })
          ] : []),
          ...(report.vehicleNumber ? [
            new Paragraph({
              children: [
                new TextRun({ text: `רכב מספר `, bold: true }),
                new TextRun(report.vehicleNumber),
              ],
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
            })
          ] : []),
          
          new Paragraph({ text: "", spacing: { before: 200, after: 200 } }),
          
          new Paragraph({
            children: [new TextRun({ text: "תוכן:", bold: true, underline: {} })],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
          }),
          
          ...report.content.split('\n').map(line => 
            new Paragraph({
              text: line,
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
            })
          ),
          
          new Paragraph({ text: "", spacing: { before: 200, after: 200 } }),
          
          ...(report.meansUsed ? [
            new Paragraph({
              children: [
                new TextRun({ text: `שימוש באמצעים: `, bold: true }),
                new TextRun(report.meansUsed),
              ],
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
            })
          ] : []),
          ...(report.closingResult ? [
            new Paragraph({
              children: [
                new TextRun({ text: `סיום: `, bold: true }),
                new TextRun(report.closingResult),
              ],
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
            })
          ] : []),
          ...(report.eventNumber ? [
            new Paragraph({
              children: [
                new TextRun({ text: `מספר אירוע: `, bold: true }),
                new TextRun(report.eventNumber),
              ],
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
            })
          ] : []),
          
          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun({ text: `מדווח: `, bold: true }),
              new TextRun(report.user.fullName),
              new TextRun({ text: ` (${report.user.personalId})`, color: "666666" }),
            ],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
          }),
        ],
      }],
    });

    return Packer.toBuffer(doc);
  }
}
