import { Body, Controller, Get, Param, Post, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { ReportsService } from './reports.service.js';

class GenerateReportDto {
  @IsIn(['TECHNIQUE', 'SANITAIRE', 'FINANCIER', 'PRODUCTION', 'RENTABILITE'])
  reportType!: 'TECHNIQUE' | 'SANITAIRE' | 'FINANCIER' | 'PRODUCTION' | 'RENTABILITE';

  @IsIn(['PDF', 'XLSX'])
  format!: 'PDF' | 'XLSX';
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farms/:farmId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async listReports(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.reportsService.listReports(user, farmId);
  }

  @Post()
  async generateReport(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: GenerateReportDto
  ) {
    return this.reportsService.generateReport(user, farmId, body);
  }

  @Get(':reportId/download')
  async downloadReport(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Param('reportId') reportId: string,
    @Res({ passthrough: true })
    response: {
      setHeader: (name: string, value: string) => void;
    }
  ) {
    const { report, buffer } = await this.reportsService.downloadReport(user, farmId, reportId);

    const fileName = report.fileUrl.split(/[\\/]/).pop() ?? `report-${report.id}`;
    const mimeType =
      report.fileFormat === 'XLSX'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

    response.setHeader('Content-Type', mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return new StreamableFile(buffer);
  }
}
