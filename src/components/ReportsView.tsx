/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Filter,
  Download,
  FileSpreadsheet,
  Layers,
  Lock
} from 'lucide-react';
import {
  UserRole,
  Lot,
  EggProduction,
  EggSale,
  AnimalFeeding,
  FishBassin,
  CultureParcelle,
  Campaign,
  StockArticle,
  StockMovement,
  FinanceTransaction,
  SanitaryTreatment
} from '../types';

interface ReportsViewProps {
  role: UserRole;
  lots: Lot[];
  eggProductions: EggProduction[];
  eggSales: EggSale[];
  feedings: AnimalFeeding[];
  fishBassins: FishBassin[];
  parcelles: CultureParcelle[];
  campaigns: Campaign[];
  articles: StockArticle[];
  movements: StockMovement[];
  transactions: FinanceTransaction[];
  treatments: SanitaryTreatment[];
  currency: string;
  areaUnit: string;
}

type ExportRow = Record<string, string | number>;

export default function ReportsView({
  role,
  lots,
  eggProductions,
  eggSales,
  feedings,
  fishBassins,
  parcelles,
  campaigns,
  articles,
  movements,
  transactions,
  treatments,
  currency,
  areaUnit
}: ReportsViewProps) {
  const normalizeKey = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [reportType, setReportType] = useState<'global' | 'finances' | 'livestock' | 'eggs' | 'fish' | 'stocks' | 'sanitary'>('global');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const reportLabels = {
    global: "Consolide de l'exploitation",
    finances: 'Compte de resultat simplifie',
    livestock: 'Performance des lots de chair',
    eggs: 'Suivi de ponte et casse',
    fish: 'Croissance et qualite des bassins',
    stocks: 'Mouvements des intrants',
    sanitary: 'Couverture sanitaire'
  } as const;

  const periodLabels = {
    week: 'Hebdomadaire',
    month: 'Mensuel',
    year: 'Annuel'
  } as const;

  const formatCurrency = (value: number) =>
    `${new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      maximumFractionDigits: 0
    }).format(value)} ${currency}`;

  const reportEndDate = new Date();
  const reportStartDate = new Date(reportEndDate);
  if (period === 'week') {
    reportStartDate.setDate(reportStartDate.getDate() - 7);
  } else if (period === 'month') {
    reportStartDate.setMonth(reportStartDate.getMonth() - 1);
  } else {
    reportStartDate.setFullYear(reportStartDate.getFullYear() - 1);
  }

  const isWithinPeriod = (value?: string) => {
    if (!value) return false;
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) && date >= reportStartDate && date <= reportEndDate;
  };

  const periodTransactions = transactions.filter((transaction) => isWithinPeriod(transaction.date));
  const periodProductions = eggProductions.filter((production) => isWithinPeriod(production.date));
  const periodEggSales = eggSales.filter((sale) => isWithinPeriod(sale.date));
  const periodFeedings = feedings.filter((feeding) => isWithinPeriod(feeding.date));
  const periodMovements = movements.filter((movement) => isWithinPeriod(movement.date));
  const periodTreatments = treatments.filter((treatment) => isWithinPeriod(treatment.date));
  const periodCampaigns = campaigns.filter((campaign) => isWithinPeriod(campaign.startDate) || isWithinPeriod(campaign.endDate));

  const sumTransactions = (type: 'income' | 'expense', ...moduleNames: string[]) => {
    const normalizedModules = moduleNames.map(normalizeKey);
    return periodTransactions
      .filter(
        (transaction) =>
          transaction.type === type &&
          normalizedModules.includes(normalizeKey(transaction.sourceModule || 'general'))
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  };

  const layingLots = lots.filter((lot) => normalizeKey(lot.species).includes('pondeuses'));
  const layingLotIds = new Set(layingLots.map((lot) => lot.id));
  const livestockLots = lots.filter((lot) => !layingLotIds.has(lot.id));
  const livestockLotIds = new Set(livestockLots.map((lot) => lot.id));

  const globalIncome = periodTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const globalExpenses = periodTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const stockValue = articles.reduce((sum, article) => sum + Math.max(article.quantity, 0) * (article.unitCost ?? 0), 0);
  const lowStockCount = articles.filter((article) => article.quantity <= (article.minimumStock ?? article.minThreshold ?? 0)).length;

  const eggCollected = periodProductions.reduce((sum, production) => sum + production.collectedCount, 0);
  const eggCompliant = periodProductions.reduce((sum, production) => sum + production.compliantCount, 0);
  const eggBroken = periodProductions.reduce((sum, production) => sum + production.brokenCount + production.lossesCount, 0);
  const eggRevenue = sumTransactions('income', 'pondeuses');
  const eggFeedCost = periodFeedings
    .filter((feeding) => layingLotIds.has(feeding.lotId))
    .reduce((sum, feeding) => sum + feeding.totalCost, 0);
  const eggSalesVolume = periodEggSales.reduce((sum, sale) => sum + sale.eggsSold, 0);

  const livestockFeedCost = periodFeedings
    .filter((feeding) => livestockLotIds.has(feeding.lotId))
    .reduce((sum, feeding) => sum + feeding.totalCost, 0);
  const livestockExpenses = sumTransactions('expense', 'elevage');
  const livestockIncome = sumTransactions('income', 'elevage');
  const livestockMortality = livestockLots.reduce((sum, lot) => sum + lot.mortalityCount, 0);

  const fishIncome = sumTransactions('income', 'pisciculture');
  const fishExpenses = sumTransactions('expense', 'pisciculture');
  const activeBassins = fishBassins.filter((bassin) => bassin.status === 'active');
  const activeFishCount = activeBassins.reduce((sum, bassin) => sum + bassin.currentCount, 0);

  const cropsIncome = sumTransactions('income', 'cultures');
  const cropsExpenses = sumTransactions('expense', 'cultures');
  const cultivatedArea = parcelles
    .filter((parcelle) => parcelle.status === 'cultivated')
    .reduce((sum, parcelle) => sum + parcelle.area, 0);
  const harvestedCampaigns = periodCampaigns.filter((campaign) => campaign.status === 'harvested').length;

  const sanitaryCompleted = periodTreatments.filter((treatment) => treatment.status === 'completed').length;
  const sanitaryPlanned = periodTreatments.filter((treatment) => treatment.status === 'planned').length;
  const sanitaryCost = periodTransactions
    .filter(
      (transaction) =>
        transaction.type === 'expense' && normalizeKey(transaction.sourceModule || '') === 'sanitaire'
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const reportPreviewMap: Record<
    typeof reportType,
    {
      title: string;
      cards: Array<{ label: string; value: string; tone?: 'good' | 'alert' | 'neutral' }>;
      insight: string;
    }
  > = {
    global: {
      title: "Consolide d'exploitation",
      cards: [
        { label: 'Revenus periode', value: formatCurrency(globalIncome), tone: 'good' },
        { label: 'Charges periode', value: formatCurrency(globalExpenses), tone: 'neutral' },
        {
          label: 'Resultat net',
          value: formatCurrency(globalIncome - globalExpenses),
          tone: globalIncome - globalExpenses >= 0 ? 'good' : 'alert'
        },
        { label: 'Valeur du stock', value: formatCurrency(stockValue), tone: 'neutral' }
      ],
      insight: `${lowStockCount} article(s) sont en seuil bas sur la ferme. Le rapport consolide les principaux flux de production, stock et tresorerie.`
    },
    finances: {
      title: 'Compte de resultat simplifie',
      cards: [
        { label: 'Encaissements', value: formatCurrency(globalIncome), tone: 'good' },
        { label: 'Decaissements', value: formatCurrency(globalExpenses), tone: 'neutral' },
        {
          label: 'Solde periode',
          value: formatCurrency(globalIncome - globalExpenses),
          tone: globalIncome - globalExpenses >= 0 ? 'good' : 'alert'
        },
        { label: 'Flux comptables', value: `${periodTransactions.length}`, tone: 'neutral' }
      ],
      insight: 'Toutes les ecritures deja generees par les modules metier et la tresorerie manuelle sont integrees automatiquement.'
    },
    livestock: {
      title: 'Performance elevage',
      cards: [
        { label: 'Lots suivis', value: `${livestockLots.length}`, tone: 'neutral' },
        { label: 'Revenus elevage', value: formatCurrency(livestockIncome), tone: 'good' },
        { label: 'Charge aliment', value: formatCurrency(livestockFeedCost), tone: 'neutral' },
        { label: 'Mortalite cumulee', value: `${livestockMortality}`, tone: livestockMortality > 0 ? 'alert' : 'good' }
      ],
      insight: `Les lots hors pondeuses affichent ${formatCurrency(livestockExpenses)} de charges elevage en comptabilite sur la periode.`
    },
    eggs: {
      title: 'Suivi ponte et marge oeufs',
      cards: [
        { label: 'Oeufs collectes', value: `${eggCollected.toLocaleString('fr-FR')}`, tone: 'good' },
        { label: 'Oeufs conformes', value: `${eggCompliant.toLocaleString('fr-FR')}`, tone: 'good' },
        { label: 'Pertes et casse', value: `${eggBroken.toLocaleString('fr-FR')}`, tone: eggBroken > 0 ? 'alert' : 'good' },
        { label: 'Revenus oeufs', value: formatCurrency(eggRevenue), tone: 'good' }
      ],
      insight: `${eggSalesVolume.toLocaleString('fr-FR')} oeufs vendus sur la periode, pour ${formatCurrency(eggFeedCost)} d'aliment distribue aux lots de ponte.`
    },
    fish: {
      title: 'Performance piscicole',
      cards: [
        { label: 'Bassins actifs', value: `${activeBassins.length}`, tone: 'neutral' },
        { label: 'Poissons suivis', value: `${activeFishCount.toLocaleString('fr-FR')}`, tone: 'good' },
        { label: 'Revenus pisciculture', value: formatCurrency(fishIncome), tone: 'good' },
        { label: 'Charges pisciculture', value: formatCurrency(fishExpenses), tone: 'neutral' }
      ],
      insight: 'Les ventes et couts remontes depuis la pisciculture alimentent automatiquement cette synthese.'
    },
    stocks: {
      title: 'Logistique et intrants',
      cards: [
        { label: 'Articles suivis', value: `${articles.length}`, tone: 'neutral' },
        { label: 'Mouvements periode', value: `${periodMovements.length}`, tone: 'neutral' },
        { label: 'Stock sensible', value: `${lowStockCount}`, tone: lowStockCount > 0 ? 'alert' : 'good' },
        { label: 'Capital stocke', value: formatCurrency(stockValue), tone: 'neutral' }
      ],
      insight: 'Les entrees, sorties et ajustements restent relies a la valeur du stock et aux besoins de reapprovisionnement.'
    },
    sanitary: {
      title: 'Couverture sanitaire',
      cards: [
        { label: 'Soins realises', value: `${sanitaryCompleted}`, tone: 'good' },
        { label: 'Soins planifies', value: `${sanitaryPlanned}`, tone: sanitaryPlanned > 0 ? 'alert' : 'neutral' },
        { label: 'Cout sanitaire', value: formatCurrency(sanitaryCost), tone: 'neutral' },
        { label: 'Campagnes recoltees', value: `${harvestedCampaigns}`, tone: 'neutral' }
      ],
      insight: 'Le rapport rapproche les actes realises, ceux qui restent planifies et les couts sanitaires passes en comptabilite.'
    }
  };

  const reportPreview = reportPreviewMap[reportType];

  const buildRows = (): ExportRow[] => {
    const summaryRows: ExportRow[] = reportPreview.cards.map((card) => ({
      section: 'Synthese',
      indicateur: card.label,
      valeur: card.value
    }));

    if (reportType === 'finances' || reportType === 'global') {
      return [
        ...summaryRows,
        ...periodTransactions.map((transaction) => ({
          section: 'Transactions',
          date: transaction.date,
          module: transaction.sourceModule,
          type: transaction.type,
          categorie: transaction.category,
          description: transaction.description,
          montant: transaction.amount
        }))
      ];
    }

    if (reportType === 'livestock') {
      return [
        ...summaryRows,
        ...livestockLots.map((lot) => ({
          section: 'Lots',
          lot: lot.name,
          espece: lot.species,
          race: lot.breed,
          effectif_initial: lot.initialCount,
          effectif_actuel: lot.currentCount,
          mortalite: lot.mortalityCount,
          statut: lot.status,
          cout_acquisition: lot.acquisitionCost ?? lot.initialCount * (lot.unitCost ?? 0)
        })),
        ...periodFeedings
          .filter((feeding) => livestockLotIds.has(feeding.lotId))
          .map((feeding) => ({
            section: 'Alimentation',
            date: feeding.date,
            lot: feeding.lotName ?? feeding.lotId,
            article: feeding.articleName,
            quantite: feeding.quantity,
            unite: feeding.unit,
            cout_total: feeding.totalCost
          }))
      ];
    }

    if (reportType === 'eggs') {
      return [
        ...summaryRows,
        ...periodProductions.map((production) => ({
          section: 'Ponte',
          date: production.date,
          lot: lots.find((lot) => lot.id === production.lotId)?.name ?? production.lotId,
          oeufs_collectes: production.collectedCount,
          oeufs_conformes: production.compliantCount,
          casses: production.brokenCount,
          pertes: production.lossesCount,
          stock: production.stockCount
        })),
        ...periodEggSales.map((sale) => ({
          section: 'Ventes oeufs',
          date: sale.date,
          lot: lots.find((lot) => lot.id === sale.lotId)?.name ?? sale.lotId,
          client: sale.customerName ?? 'Client comptoir',
          oeufs_vendus: sale.eggsSold,
          plateaux: sale.traysSold,
          prix_unitaire: sale.unitPrice,
          montant: sale.amountPaid
        }))
      ];
    }

    if (reportType === 'fish') {
      return [
        ...summaryRows,
        ...fishBassins.map((bassin) => ({
          section: 'Bassins',
          bassin: bassin.name,
          espece: bassin.species,
          effectif_initial: bassin.initialCount,
          effectif_actuel: bassin.currentCount,
          mortalite: bassin.mortalityCount,
          date_mise_en_charge: bassin.stockingDate,
          statut: bassin.status
        }))
      ];
    }

    if (reportType === 'stocks') {
      return [
        ...summaryRows,
        ...articles.map((article) => ({
          section: 'Articles',
          article: article.name,
          categorie: article.category,
          quantite: article.quantity,
          unite: article.unit,
          seuil_minimum: article.minimumStock ?? article.minThreshold,
          prix_unitaire: article.unitCost ?? 0,
          valeur: Math.max(article.quantity, 0) * (article.unitCost ?? 0)
        })),
        ...periodMovements.map((movement) => ({
          section: 'Mouvements',
          date: movement.date,
          article_id: movement.articleId,
          type: movement.type,
          quantite: movement.quantity,
          raison: movement.reason,
          module_source: movement.sourceModule ?? 'Stocks'
        }))
      ];
    }

    if (reportType === 'sanitary') {
      return [
        ...summaryRows,
        ...periodTreatments.map((treatment) => ({
          section: 'Soins',
          date: treatment.date,
          lot: lots.find((lot) => lot.id === treatment.lotId)?.name ?? treatment.lotId,
          type: treatment.type,
          soin: treatment.name,
          dosage: treatment.dosage,
          produit: treatment.productId,
          quantite: treatment.quantityUsed,
          statut: treatment.status,
          cout: treatment.cost
        }))
      ];
    }

    return [
      ...summaryRows,
      ...periodCampaigns.map((campaign) => ({
        section: 'Campagnes',
        parcelle: parcelles.find((parcelle) => parcelle.id === campaign.parcelleId)?.name ?? campaign.parcelleId,
        culture: campaign.cropType,
        variete: campaign.variety,
        debut: campaign.startDate,
        fin: campaign.endDate ?? '',
        statut: campaign.status,
        rendement_attendu: campaign.expectedYield ?? 0,
        rendement_reel: campaign.actualYield ?? 0,
        depenses: campaign.expenses,
        revenus: campaign.revenues
      })),
      ...periodTransactions.map((transaction) => ({
        section: 'Transactions',
        date: transaction.date,
        module: transaction.sourceModule,
        type: transaction.type,
        categorie: transaction.category,
        montant: transaction.amount
      }))
    ];
  };

  const escapeCsvValue = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

  const downloadFile = (content: BlobPart, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCsv = (rows: ExportRow[], fileName: string) => {
    if (rows.length === 0) {
      downloadFile('Aucune donnee disponible', fileName, 'text/csv;charset=utf-8;');
      return;
    }

    const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    const lines = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header] ?? '')).join(','))
    ];

    downloadFile(`\uFEFF${lines.join('\n')}`, fileName, 'text/csv;charset=utf-8;');
  };

  const exportExcelCompatible = (rows: ExportRow[], fileName: string) => {
    if (rows.length === 0) {
      downloadFile('Aucune donnee disponible', fileName, 'application/vnd.ms-excel;charset=utf-8;');
      return;
    }

    const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    const tableHtml = `
      <table>
        <thead>
          <tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) =>
                `<tr>${headers
                  .map((header) => `<td>${String(row[header] ?? '')}</td>`)
                  .join('')}</tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin-bottom: 8px; }
            p { font-size: 12px; color: #475569; }
            table { border-collapse: collapse; width: 100%; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>${reportPreview.title}</h1>
          <p>Periode: ${reportStartDate.toLocaleDateString('fr-FR')} au ${reportEndDate.toLocaleDateString('fr-FR')}</p>
          ${tableHtml}
        </body>
      </html>
    `;

    downloadFile(html, fileName, 'application/vnd.ms-excel;charset=utf-8;');
  };

  const printAsPdf = () => {
    const rows = buildRows();
    const headers = rows.length > 0 ? Array.from(new Set(rows.flatMap((row) => Object.keys(row)))) : [];
    const tableRows = rows
      .map(
        (row) =>
          `<tr>${headers.map((header) => `<td>${String(row[header] ?? '')}</td>`).join('')}</tr>`
      )
      .join('');

    const printWindow = window.open('', '_blank', 'width=1080,height=780');
    if (!printWindow) {
      console.error('PDF print window could not be opened');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportPreview.title}</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p { font-size: 12px; color: #475569; margin: 0 0 8px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
            .card { border: 1px solid #dbeafe; background: #f0fdf4; padding: 12px; border-radius: 12px; }
            .label { font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
            .value { font-size: 14px; font-weight: bold; }
            table { border-collapse: collapse; width: 100%; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${reportPreview.title}</h1>
          <p>Periode: ${reportStartDate.toLocaleDateString('fr-FR')} au ${reportEndDate.toLocaleDateString('fr-FR')}</p>
          <p>${reportPreview.insight}</p>
          <div class="grid">
            ${reportPreview.cards
              .map(
                (card) => `
                  <div class="card">
                    <div class="label">${card.label}</div>
                    <div class="value">${card.value}</div>
                  </div>
                `
              )
              .join('')}
          </div>
          ${
            headers.length > 0
              ? `
                <table>
                  <thead>
                    <tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr>
                  </thead>
                  <tbody>${tableRows}</tbody>
                </table>
              `
              : '<p>Aucune donnee detaillee disponible.</p>'
          }
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleExport = (format: 'PDF' | 'EXCEL' | 'CSV') => {
    setIsExporting(format);

    window.setTimeout(() => {
      const baseName = `FermePlus_Rapport_${reportType}_${period}`;
      const rows = buildRows();

      if (format === 'CSV') {
        exportCsv(rows, `${baseName}.csv`);
      } else if (format === 'EXCEL') {
        exportExcelCompatible(rows, `${baseName}.xls`);
      } else {
        printAsPdf();
      }

      setIsExporting(null);
    }, 250);
  };

  return (
    <div id="rapports-view" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Module Rapports & Decisions Analytiques
          </h2>
          <p className="text-xs text-slate-500">
            Generez des rapports consolides de production, financiers et sanitaires pour la gestion de votre ferme.
          </p>
        </div>
        {role === 'owner' && (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            <Lock className="w-3 h-3" /> Lecture seule
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-emerald-600" />
            Criteres d'analyse du rapport
          </h3>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs">
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Apercu du rapport</span>
            <span className="mt-1 block text-sm font-semibold text-emerald-900">{reportLabels[reportType]}</span>
            <p className="mt-1 text-[11px] text-emerald-800">Periode selectionnee: {periodLabels[period]}</p>
            <p className="mt-1 text-[11px] text-emerald-800">Les exports reprendront exactement ce perimetre.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Periodicite</label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPeriod('week')}
                className={`py-2 px-1 rounded-full border text-center transition-all shadow-sm hover:-translate-y-0.5 ${
                  period === 'week'
                    ? 'bg-emerald-600 border-emerald-600 text-white font-bold'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                Hebdomadaire
              </button>
              <button
                type="button"
                onClick={() => setPeriod('month')}
                className={`py-2 px-1 rounded-full border text-center transition-all shadow-sm hover:-translate-y-0.5 ${
                  period === 'month'
                    ? 'bg-emerald-600 border-emerald-600 text-white font-bold'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setPeriod('year')}
                className={`py-2 px-1 rounded-full border text-center transition-all shadow-sm hover:-translate-y-0.5 ${
                  period === 'year'
                    ? 'bg-emerald-600 border-emerald-600 text-white font-bold'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                Annuel
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type de synthese</label>
            <select
              id="report-type-select"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as typeof reportType)}
              className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="global">Consolide de l'exploitation (Global)</option>
              <option value="finances">Finances : Compte de resultat simplifie</option>
              <option value="livestock">Elevage : Performance des lots de chair</option>
              <option value="eggs">Pondeuses : Suivi de ponte et casse</option>
              <option value="fish">Pisciculture : Croissance et qualite des bassins</option>
              <option value="stocks">Logistique : Mouvements des intrants</option>
              <option value="sanitary">Sanitaire : Couverture sanitaire</option>
            </select>
            <p className="mt-1 text-[10px] text-slate-500">Choisir le rapport a afficher et exporter.</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-[11px] text-slate-500 leading-normal shadow-sm">
            Le rapport extrait les donnees consolidees en temps reel des modules. Tout nouvel enregistrement y est automatiquement inclus.
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-6">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-emerald-950">{reportPreview.title}</h3>
                <p className="mt-1 text-xs text-emerald-800">
                  Periode analysee: du {reportStartDate.toLocaleDateString('fr-FR')} au {reportEndDate.toLocaleDateString('fr-FR')}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
                {periodLabels[period]}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {reportPreview.cards.map((card) => (
                <div key={card.label} className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-sm">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{card.label}</div>
                  <div
                    className={`mt-1 text-sm font-bold ${
                      card.tone === 'good'
                        ? 'text-emerald-700'
                        : card.tone === 'alert'
                          ? 'text-rose-700'
                          : 'text-slate-900'
                    }`}
                  >
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-emerald-900">{reportPreview.insight}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Cultures</div>
              <div className="mt-2 text-sm font-bold text-slate-900">{cultivatedArea.toFixed(1)} {areaUnit}</div>
              <p className="mt-1 text-[11px] text-slate-500">Surface actuellement cultivee dans les parcelles suivies.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Pisciculture</div>
              <div className="mt-2 text-sm font-bold text-slate-900">{activeFishCount.toLocaleString('fr-FR')} poissons</div>
              <p className="mt-1 text-[11px] text-slate-500">Effectif encore suivi dans les bassins actifs.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Pondeuses</div>
              <div className="mt-2 text-sm font-bold text-slate-900">{eggSalesVolume.toLocaleString('fr-FR')} oeufs vendus</div>
              <p className="mt-1 text-[11px] text-slate-500">Ventes d'oeufs consolidees sur la periode du rapport.</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">Generation et telechargements</h3>
            <p className="text-xs text-slate-500 mt-0.5">Choisissez le format d'export de votre choix.</p>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-600">
              CSV pour les donnees brutes, Excel pour les tableaux exploitables et PDF via la boite d'impression du navigateur.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => !isExporting && handleExport('EXCEL')}
              className={`p-4 rounded-3xl border border-slate-100 hover:border-emerald-500/40 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer text-center space-y-3 flex flex-col items-center justify-center shadow-sm hover:shadow-md ${
                isExporting ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Format Excel compatible</h4>
                <p className="text-[10px] text-slate-400 mt-1">Ideal pour les calculs, filtres et tableaux a retraiter.</p>
              </div>
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-full flex items-center gap-1 mt-1 shadow-sm">
                <Download className="w-3 h-3" /> EXPORT .XLS
              </span>
            </div>

            <div
              onClick={() => !isExporting && handleExport('PDF')}
              className={`p-4 rounded-3xl border border-slate-100 hover:border-rose-500/40 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer text-center space-y-3 flex flex-col items-center justify-center shadow-sm hover:shadow-md ${
                isExporting ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <div className="bg-rose-50 text-rose-600 p-3 rounded-full">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Impression PDF</h4>
                <p className="text-[10px] text-slate-400 mt-1">Ouvre une mise en page imprimee que vous pouvez enregistrer en PDF.</p>
              </div>
              <span className="text-[10px] bg-rose-600 text-white font-bold px-2.5 py-1 rounded-full flex items-center gap-1 mt-1 shadow-sm">
                <Download className="w-3 h-3" /> IMPRIMER PDF
              </span>
            </div>

            <div
              onClick={() => !isExporting && handleExport('CSV')}
              className={`p-4 rounded-3xl border border-slate-100 hover:border-slate-500/40 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer text-center space-y-3 flex flex-col items-center justify-center shadow-sm hover:shadow-md ${
                isExporting ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <div className="bg-slate-100 text-slate-600 p-3 rounded-full">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Format CSV</h4>
                <p className="text-[10px] text-slate-400 mt-1">Format brut leger pour sauvegarde ou reprise dans un autre outil.</p>
              </div>
              <span className="text-[10px] bg-slate-700 text-white font-bold px-2.5 py-1 rounded-full flex items-center gap-1 mt-1 shadow-sm">
                <Download className="w-3 h-3" /> EXPORT .CSV
              </span>
            </div>
          </div>

          {isExporting && (
            <div className="p-3 bg-slate-50 border border-slate-200 text-center rounded-2xl text-xs text-slate-500 flex items-center justify-center gap-2 animate-pulse shadow-sm">
              <span>Preparation du rapport {reportLabels[reportType]} au format {isExporting}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
