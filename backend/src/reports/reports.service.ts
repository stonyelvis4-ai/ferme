import { Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pdfMake from 'pdfmake/build/pdfmake.js';
import pdfFonts from 'pdfmake/build/vfs_fonts.js';
import * as XLSX from 'xlsx';
import { type SessionUser } from '../auth/auth.service.js';
import { FarmsService } from '../farms/farms.service.js';
import { PrismaService } from '../shared/database/prisma.service.js';

export interface GeneratedReportView {
  reportType: 'TECHNIQUE' | 'SANITAIRE' | 'FINANCIER' | 'PRODUCTION' | 'RENTABILITE';
  format: 'PDF' | 'XLSX';
  reportId: string;
  generatedAt: string;
  fileName: string;
  mimeType: string;
  fileUrl: string;
  summary: string;
  sections: Array<{
    title: string;
    lines: string[];
  }>;
  content: string;
}

export interface ReportHistoryView {
  id: string;
  reportType: 'TECHNIQUE' | 'SANITAIRE' | 'FINANCIER' | 'PRODUCTION' | 'RENTABILITE';
  format: 'PDF' | 'XLSX';
  generatedAt: string;
  fileName: string;
  downloadUrl: string;
}

@Injectable()
export class ReportsService {
  private readonly reportsDirectory = fileURLToPath(new URL('../../generated-reports', import.meta.url));

  constructor(
    private readonly farmsService: FarmsService,
    private readonly prisma: PrismaService
  ) {}

  async listReports(user: SessionUser, farmId: string): Promise<{ items: ReportHistoryView[] }> {
    const farm = await this.farmsService.getFarm(user, farmId);
    const reports = await this.prisma.report.findMany({
      where: { farmId: farm.id },
      orderBy: { generatedAt: 'desc' }
    });

    return {
      items: reports.map((report) => ({
        id: report.id,
        reportType: report.reportType,
        format: report.fileFormat,
        generatedAt: report.generatedAt.toISOString(),
        fileName: report.fileUrl.split(/[\\/]/).pop() ?? `report-${report.id}`,
        downloadUrl: `/farms/${farm.id}/reports/${report.id}/download`
      }))
    };
  }

  async generateReport(
    user: SessionUser,
    farmId: string,
    input: {
      reportType: GeneratedReportView['reportType'];
      format: GeneratedReportView['format'];
    }
  ): Promise<GeneratedReportView> {
    const farm = await this.farmsService.getFarm(user, farmId);

    const [
      animalGroups,
      stockItems,
      sanitaryEvents,
      transactions,
      agendaTasks,
      alerts,
      crops,
      harvests,
      productionRecords,
      productStocks,
      productSales
    ] = await Promise.all([
      this.prisma.animalGroup.findMany({
        where: { farmId: farm.id },
        select: { species: true, currentCount: true, status: true }
      }),
      this.prisma.stockItem.findMany({
        where: { farmId: farm.id },
        select: { name: true, currentQuantity: true, lowStockThreshold: true, unit: true }
      }),
      this.prisma.sanitaryEvent.findMany({
        where: { farmId: farm.id },
        select: { eventType: true, status: true, eventDate: true }
      }),
      this.prisma.financialTransaction.findMany({
        where: { farmId: farm.id },
        select: { transactionType: true, amount: true, category: true, transactionDate: true }
      }),
      this.prisma.agendaTask.findMany({
        where: { farmId: farm.id },
        select: { title: true, status: true, scheduledLabel: true }
      }),
      this.prisma.alert.findMany({
        where: { farmId: farm.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { title: true, severity: true, createdAt: true }
      }),
      this.prisma.crop.findMany({
        where: { farmId: farm.id },
        select: { name: true, cultivatedArea: true, status: true, actualYield: true }
      }),
      this.prisma.harvest.findMany({
        where: { farmId: farm.id },
        select: { quantity: true, revenue: true, unit: true, harvestedAt: true }
      }),
      this.prisma.productionRecord.findMany({
        where: { farmId: farm.id },
        select: {
          productionType: true,
          quantityProduced: true,
          quantitySellable: true,
          quantityLost: true,
          unit: true
        }
      }),
      this.prisma.productStock.findMany({
        where: { farmId: farm.id },
        select: { productName: true, availableQuantity: true, unit: true, productionType: true }
      }),
      this.prisma.productSale.findMany({
        where: { farmId: farm.id },
        select: { productName: true, quantitySold: true, unit: true, totalAmount: true, remainingAmount: true }
      })
    ]);

    const revenue = transactions
      .filter((item) => item.transactionType === 'REVENU')
      .reduce((sum, item) => sum + item.amount, 0);
    const expenses = transactions
      .filter((item) => item.transactionType === 'DEPENSE')
      .reduce((sum, item) => sum + item.amount, 0);
    const balance = revenue - expenses;
    const lowStockItems = stockItems.filter((item) => item.currentQuantity <= item.lowStockThreshold);
    const criticalSanitaryEvents = sanitaryEvents.filter((item) => item.status === 'CRITIQUE');
    const overdueTasks = agendaTasks.filter((item) => item.status === 'EN_RETARD');
    const harvestedQuantity = harvests.reduce((sum, item) => sum + item.quantity, 0);
    const harvestRevenue = harvests.reduce((sum, item) => sum + (item.revenue ?? 0), 0);

    const sections = this.buildSections(input.reportType, {
      farmName: farm.name,
      animalGroups,
      stockItems,
      lowStockItems,
      sanitaryEvents,
      criticalSanitaryEvents,
      transactions,
      revenue,
      expenses,
      balance,
      agendaTasks,
      overdueTasks,
      alerts,
      crops,
      harvests,
      productionRecords,
      productStocks,
      productSales,
      harvestedQuantity,
      harvestRevenue
    });

    const generatedAt = new Date().toISOString();
    const safeType = input.reportType.toLowerCase();
    const extension = input.format === 'XLSX' ? 'xlsx' : 'pdf';
    const fileName = `${farm.name.replace(/\s+/g, '-').toLowerCase()}-${safeType}.${extension}`;
    const mimeType =
      input.format === 'XLSX'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
    const content = this.toTextReport(farm.name, input.reportType, generatedAt, sections);

    const persisted = await this.prisma.report.create({
      data: {
        farmId: farm.id,
        reportType: input.reportType,
        fileFormat: input.format,
        fileUrl: fileName,
        generatedAt: new Date(generatedAt),
        generatedByUserId: user.id
      }
    });

    const binaryContent =
      input.format === 'XLSX'
        ? this.toWorkbookBuffer(sections)
        : await this.toPdfBuffer(farm.name, input.reportType, generatedAt, sections);
    const persistedFilePath = await this.persistReportFile(persisted.id, fileName, binaryContent);
    const fileUrl = `/farms/${farm.id}/reports/${persisted.id}/download`;

    await this.prisma.report.update({
      where: { id: persisted.id },
      data: { fileUrl: persistedFilePath }
    });

    return {
      reportId: persisted.id,
      reportType: input.reportType,
      format: input.format,
      generatedAt,
      fileName,
      mimeType,
      fileUrl,
      summary: `${input.reportType} genere pour ${farm.name} avec ${sections.length} section(s).`,
      sections,
      content
    };
  }

  async downloadReport(user: SessionUser, farmId: string, reportId: string) {
    const farm = await this.farmsService.getFarm(user, farmId);
    const report = await this.prisma.report.findFirst({
      where: {
        id: reportId,
        farmId: farm.id
      }
    });

    if (!report) {
      throw new NotFoundException('Rapport introuvable');
    }

    return {
      report,
      buffer: await readFile(report.fileUrl)
    };
  }

  private buildSections(
    reportType: GeneratedReportView['reportType'],
    data: {
      farmName: string;
      animalGroups: Array<{ species: string; currentCount: number | null; status: string }>;
      stockItems: Array<{ name: string; currentQuantity: number; lowStockThreshold: number; unit: string }>;
      lowStockItems: Array<{ name: string; currentQuantity: number; lowStockThreshold: number; unit: string }>;
      sanitaryEvents: Array<{ eventType: string; status: string; eventDate: Date }>;
      criticalSanitaryEvents: Array<{ eventType: string; status: string; eventDate: Date }>;
      transactions: Array<{ transactionType: string; amount: number; category: string; transactionDate: Date }>;
      revenue: number;
      expenses: number;
      balance: number;
      agendaTasks: Array<{ title: string; status: string; scheduledLabel: string }>;
      overdueTasks: Array<{ title: string; status: string; scheduledLabel: string }>;
      alerts: Array<{ title: string; severity: string; createdAt: Date }>;
      crops: Array<{ name: string; cultivatedArea: number; status: string; actualYield: number | null }>;
      harvests: Array<{ quantity: number; revenue: number | null; unit: string; harvestedAt: Date }>;
      productionRecords: Array<{
        productionType: string;
        quantityProduced: number;
        quantitySellable: number;
        quantityLost: number;
        unit: string;
      }>;
      productStocks: Array<{ productName: string; availableQuantity: number; unit: string; productionType: string }>;
      productSales: Array<{ productName: string; quantitySold: number; unit: string; totalAmount: number; remainingAmount: number }>;
      harvestedQuantity: number;
      harvestRevenue: number;
    }
  ) {
    const commonSections = [
      {
        title: 'Contexte ferme',
        lines: [
          `Ferme: ${data.farmName}`,
          `Alertes recentes: ${data.alerts.length}`,
          `Taches en retard: ${data.overdueTasks.length}`
        ]
      }
    ];

    if (reportType === 'TECHNIQUE' || reportType === 'PRODUCTION') {
      return [
        ...commonSections,
        {
          title: 'Elevage',
          lines: [
            `Lots / animaux suivis: ${data.animalGroups.length}`,
            `Lots / animaux actifs: ${data.animalGroups.filter((item) => item.status === 'ACTIF').length}`,
            ...data.animalGroups.slice(0, 5).map((item) => `${item.species}: ${item.currentCount ?? 1} unite(s)`)
          ]
        },
        {
          title: 'Agenda et execution',
          lines: [
            `Taches planifiees: ${data.agendaTasks.length}`,
            `Taches en retard: ${data.overdueTasks.length}`,
            ...data.overdueTasks.slice(0, 5).map((item) => `${item.title} - ${item.scheduledLabel}`)
          ]
        },
        {
          title: 'Stocks',
          lines: [
            `Articles suivis: ${data.stockItems.length}`,
            `Stocks faibles: ${data.lowStockItems.length}`,
            ...data.lowStockItems.slice(0, 5).map((item) => `${item.name}: ${item.currentQuantity} ${item.unit}`)
          ]
        },
        {
          title: 'Cultures et rendements',
          lines: [
            `Cultures suivies: ${data.crops.length}`,
            `Surface totale: ${data.crops.reduce((sum, item) => sum + item.cultivatedArea, 0).toFixed(2)} ha`,
            `Rendement recolte: ${data.harvestedQuantity.toFixed(2)}`,
            ...data.crops.slice(0, 5).map((item) => `${item.name}: ${item.cultivatedArea} ha - ${item.status}`)
          ]
        },
        {
          title: 'Production, stocks et ventes',
          lines: [
            `Enregistrements production: ${data.productionRecords.length}`,
            `Stock produit disponible: ${data.productStocks.reduce((sum, item) => sum + item.availableQuantity, 0).toFixed(2)}`,
            `Ventes rattachees: ${data.productSales.length}`,
            ...data.productStocks.slice(0, 5).map((item) => `${item.productName}: ${item.availableQuantity.toFixed(2)} ${item.unit}`),
            ...data.productSales.slice(0, 3).map((item) => `${item.productName}: ${item.quantitySold.toFixed(2)} ${item.unit} - ${item.totalAmount.toFixed(2)}`)
          ]
        }
      ];
    }

    if (reportType === 'SANITAIRE') {
      return [
        ...commonSections,
        {
          title: 'Historique sanitaire',
          lines: [
            `Evenements sanitaires: ${data.sanitaryEvents.length}`,
            `Cas critiques: ${data.criticalSanitaryEvents.length}`,
            ...data.sanitaryEvents
              .slice(0, 8)
              .map((item) => `${item.eventType} - ${item.status} - ${item.eventDate.toLocaleDateString('fr-FR')}`)
          ]
        },
        {
          title: 'Alertes de sante',
          lines: data.alerts.length
            ? data.alerts.slice(0, 8).map((item) => `${item.severity} - ${item.title}`)
            : ['Aucune alerte recente']
        }
      ];
    }

    return [
      ...commonSections,
      {
        title: 'Synthese financiere',
        lines: [
          `Revenus: ${data.revenue.toFixed(2)}`,
          `Depenses: ${data.expenses.toFixed(2)}`,
          `Solde: ${data.balance.toFixed(2)}`
        ]
      },
      {
        title: 'Transactions recentes',
        lines: data.transactions.length
          ? data.transactions
              .slice(0, 10)
              .map(
                (item) =>
                  `${item.transactionType} - ${item.category} - ${item.amount.toFixed(2)} - ${item.transactionDate.toLocaleDateString('fr-FR')}`
              )
          : ['Aucune transaction enregistree']
      },
      {
        title: 'Rentabilite et risques',
        lines: [
          data.balance >= 0 ? 'Situation rentable a date.' : 'Situation deficitaire a surveiller.',
          `Stocks faibles: ${data.lowStockItems.length}`,
          `Evenements sanitaires critiques: ${data.criticalSanitaryEvents.length}`,
          `Recettes recoltes: ${data.harvestRevenue.toFixed(2)}`
        ]
      }
    ];
  }

  private toTextReport(
    farmName: string,
    reportType: GeneratedReportView['reportType'],
    generatedAt: string,
    sections: Array<{ title: string; lines: string[] }>
  ) {
    return [
      `Rapport ${reportType} - ${farmName}`,
      `Genere le ${new Date(generatedAt).toLocaleString('fr-FR')}`,
      '',
      ...sections.flatMap((section) => [section.title, ...section.lines.map((line) => `- ${line}`), ''])
    ].join('\n');
  }

  private toWorkbookBuffer(sections: Array<{ title: string; lines: string[] }>) {
    const rows = [['section', 'contenu']];
    for (const section of sections) {
      for (const line of section.lines) {
        rows.push([section.title, line]);
      }
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapport');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private async toPdfBuffer(
    farmName: string,
    reportType: GeneratedReportView['reportType'],
    generatedAt: string,
    sections: Array<{ title: string; lines: string[] }>
  ) {
    pdfMake.vfs = pdfFonts.vfs;

    const documentDefinition = {
      content: [
        { text: `Rapport ${reportType} - ${farmName}`, style: 'header' },
        { text: `Genere le ${new Date(generatedAt).toLocaleString('fr-FR')}`, style: 'subheader' },
        ...sections.flatMap((section) => [
          { text: section.title, style: 'sectionTitle', margin: [0, 12, 0, 6] },
          {
            ul: section.lines.map((line) => ({
              text: line
            }))
          }
        ])
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true
        },
        subheader: {
          fontSize: 10,
          color: '#475569'
        },
        sectionTitle: {
          fontSize: 13,
          bold: true,
          color: '#14532D'
        }
      },
      defaultStyle: {
        fontSize: 10
      }
    };

    return await new Promise<Buffer>((resolve) => {
      pdfMake.createPdf(documentDefinition).getBuffer((buffer) => resolve(Buffer.from(buffer)));
    });
  }

  private async persistReportFile(reportId: string, fileName: string, content: Buffer) {
    await mkdir(this.reportsDirectory, { recursive: true });
    const outputPath = join(this.reportsDirectory, `${reportId}-${fileName}`);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content);
    return outputPath;
  }
}
