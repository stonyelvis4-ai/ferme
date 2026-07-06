'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useToast } from '../../../../components/ui/toast-provider';
import { useSession } from '../../../../hooks/use-session';
import { getApiBaseUrl } from '../../../../services/api-client';
import {
  generateFarmReport,
  getFarm,
  getFarmReports,
  type GeneratedReportView,
  type ReportHistoryView
} from '../../../../services/farm-client';

type ReportFormState = {
  reportType: GeneratedReportView['reportType'];
  format: GeneratedReportView['format'];
};

const defaultForm: ReportFormState = {
  reportType: 'TECHNIQUE',
  format: 'PDF'
};

function formatBadge(format: GeneratedReportView['format']) {
  return format === 'PDF' ? ('critical' as const) : ('success' as const);
}

const reportWorkflowSteps = [
  {
    title: 'Source',
    description: 'Choisir le périmètre et le type de rapport.',
    icon: FileText
  },
  {
    title: 'Génération',
    description: 'Composer le document et ses sections.',
    icon: Sparkles
  },
  {
    title: 'Export',
    description: 'Télécharger le fichier PDF ou Excel.',
    icon: Download
  },
  {
    title: 'Historique',
    description: 'Conserver les rapports pour audit et consultation.',
    icon: FileSpreadsheet
  }
] as const;

export default function FarmReportsPage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState('');
  const [farmName, setFarmName] = useState('Ferme');
  const [form, setForm] = useState<ReportFormState>(defaultForm);
  const [report, setReport] = useState<GeneratedReportView | null>(null);
  const [history, setHistory] = useState<ReportHistoryView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  useEffect(() => {
    params.then((value) => setFarmId(value.farmId));
  }, [params]);

  useEffect(() => {
    if (!session?.token || !farmId) {
      return;
    }

    getFarm(farmId, session.token)
      .then((farm) => setFarmName(farm.name))
      .catch(() => setFarmName(`Ferme ${farmId}`));

    getFarmReports(farmId, session.token)
      .then((response) => setHistory(response.items))
      .catch(() => setHistory([]));
  }, [farmId, session?.token]);

  const reportMeta = useMemo(() => {
    if (!report) {
      return null;
    }

    return {
      sectionCount: report.sections.length,
      lineCount: report.sections.reduce((total, section) => total + section.lines.length, 0)
    };
  }, [report]);

  function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      return;
    }

    startTransition(async () => {
      try {
        const generated = await generateFarmReport(farmId, form, session.token);
        setReport(generated);
        setHistory((current) => [
          {
            id: generated.reportId,
            reportType: generated.reportType,
            format: generated.format,
            generatedAt: generated.generatedAt,
            fileName: generated.fileName,
            downloadUrl: generated.fileUrl
          },
          ...current.filter((item) => item.id !== generated.reportId)
        ]);
        setError(null);
        pushToast({
          title: 'Rapport genere',
          description: `${generated.reportType} en format ${generated.format} pret au telechargement.`,
          variant: 'success'
        });
      } catch (submissionError) {
        const message =
          submissionError instanceof Error ? submissionError.message : 'Generation impossible';
        setError(message);
        pushToast({
          title: 'Generation impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  function downloadReport() {
    if (!report || !session?.token) {
      return;
    }

    startTransition(async () => {
      try {
        const apiBase = getApiBaseUrl();
        const response = await fetch(`${apiBase}${report.fileUrl}`, {
          headers: {
            Authorization: `Bearer ${session.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Telechargement impossible');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = report.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
        pushToast({
          title: 'Telechargement lance',
          description: report.fileName,
          variant: 'success'
        });
      } catch (downloadError) {
        const message =
          downloadError instanceof Error ? downloadError.message : 'Telechargement impossible';
        setError(message);
        pushToast({
          title: 'Telechargement impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  function downloadHistoryItem(item: ReportHistoryView) {
    if (!session?.token) {
      return;
    }

    startTransition(async () => {
      try {
        const apiBase = getApiBaseUrl();
        const response = await fetch(`${apiBase}${item.downloadUrl}`, {
          headers: {
            Authorization: `Bearer ${session.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Telechargement impossible');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = item.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch (downloadError) {
        const message =
          downloadError instanceof Error ? downloadError.message : 'Telechargement impossible';
        setError(message);
        pushToast({
          title: 'Telechargement impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  return (
    <AppShell title={`Rapports - ${farmName}`}>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="module-hero-grid reports-hero-grid reports-hero-grid-premium">
        <article className="module-hero-card reports-hero-card reports-hero-card-premium">
          <div className="module-hero-top">
            <div>
              <p className="eyebrow">Exports et syntheses</p>
              <h2 className="module-hero-title">{farmName}</h2>
            </div>
            <Badge variant={report ? 'success' : 'info'}>
              {report ? `${report.reportType} pret` : 'Pret a generer'}
            </Badge>
          </div>
          <p className="hero-copy module-hero-copy">
            Une experience plus premium pour composer les rapports techniques, sanitaires, financiers
            ou de production et telecharger un document exploitable.
          </p>
          <div className="module-pill-row">
            <span className="module-detail-chip">
              <FileText className="h-4 w-4" />
              Types: technique, sanitaire, financier
            </span>
            <span className="module-detail-chip">
              <FileSpreadsheet className="h-4 w-4" />
              Formats: PDF et Excel
            </span>
            <span className="module-detail-chip">
              <Sparkles className="h-4 w-4" />
              Apercu instantane apres generation
            </span>
          </div>
          <div className="module-kpi-grid">
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <FileText className="h-5 w-5" />
                </div>
                <Badge variant="info">Rapport</Badge>
              </div>
              <strong>{report?.reportType ?? form.reportType}</strong>
              <span>modele actuellement selectionne pour l'export</span>
            </article>
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Download className="h-5 w-5" />
                </div>
                <Badge variant={formatBadge(report?.format ?? form.format)}>{report?.format ?? form.format}</Badge>
              </div>
              <strong>{reportMeta?.sectionCount ?? 0}</strong>
              <span>section(s) structuree(s) dans le document courant</span>
            </article>
            <article className="module-kpi-card">
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Sparkles className="h-5 w-5" />
                </div>
                <Badge variant="success">Apercu</Badge>
              </div>
              <strong>{reportMeta?.lineCount ?? 0}</strong>
              <span>ligne(s) de contenu deja produites pour relecture</span>
            </article>
          </div>
        </article>

        <article className="module-spotlight-card reports-spotlight-card reports-spotlight-card-premium">
          <div className="module-card-top">
            <p className="eyebrow">Centre d'export</p>
            <Badge variant="neutral">Direction</Badge>
          </div>
          <h2>Documenter la ferme sans friction</h2>
          <p>
            L'interface centralise le choix du rapport, le format, la generation, le telechargement
            et l'apercu pour limiter les aller-retours.
          </p>
          <div className="hero-actions">
            <Link href={`/farms/${farmId}/dashboard`}>
              <Button className="module-submit-button reports-action-button" variant="secondary">Retour dashboard</Button>
            </Link>
            {report ? (
              <Button className="module-submit-button reports-action-button" type="button" disabled={isPending} onClick={downloadReport}>
                Telecharger
              </Button>
            ) : null}
          </div>
        </article>
      </section>

      <section className="module-flow-strip reports-flow-strip reports-flow-strip-premium">
        {reportWorkflowSteps.map((step, index) => {
          const Icon = step.icon;

          return (
            <article key={step.title} className="module-flow-card">
              <div className="module-card-top">
                <span className="module-flow-index">0{index + 1}</span>
                <Badge variant="neutral">{step.title}</Badge>
              </div>
              <div className="module-kpi-header">
                <div className="module-kpi-icon">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <span>{step.description}</span>
            </article>
          );
        })}
      </section>

      <section className="module-action-grid reports-action-grid reports-action-grid-premium">
        <article className="module-form-card reports-form-card reports-form-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Generation</p>
              <h2>Composer le rapport</h2>
            </div>
            <div className="farm-module-icon">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <form className="stack-form" onSubmit={submitReport}>
            <div className="field-grid">
              <label className="field">
                <span>Type de rapport</span>
                <select
                  value={form.reportType}
                  onChange={(input) =>
                    setForm((current) => ({
                      ...current,
                      reportType: input.target.value as GeneratedReportView['reportType']
                    }))
                  }
                >
                  <option value="TECHNIQUE">Technique</option>
                  <option value="SANITAIRE">Sanitaire</option>
                  <option value="FINANCIER">Financier</option>
                  <option value="PRODUCTION">Production</option>
                  <option value="RENTABILITE">Rentabilite</option>
                </select>
              </label>
              <label className="field">
                <span>Format</span>
                <select
                  value={form.format}
                  onChange={(input) =>
                    setForm((current) => ({
                      ...current,
                      format: input.target.value as GeneratedReportView['format']
                    }))
                  }
                >
                  <option value="PDF">PDF</option>
                  <option value="XLSX">Excel</option>
                </select>
              </label>
            </div>
            <div className="module-inline-note">
              <span>Le rapport genere reste telechargeable ensuite depuis cette meme page.</span>
              <Button className="module-submit-button reports-action-button" type="submit" disabled={isPending}>
                {isPending ? 'Generation...' : 'Generer le rapport'}
              </Button>
            </div>
          </form>
        </article>

        <article className="module-list-card reports-format-card reports-format-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Formats disponibles</p>
              <h2>Usage recommande</h2>
            </div>
            <Badge variant="info">PDF + XLSX</Badge>
          </div>
          <div className="metric-list">
            <span>PDF pour partage, impression et lecture executive</span>
            <span>Excel pour analyse detaillee et retraitement</span>
            <span>Les sections d'apercu permettent une validation rapide avant diffusion</span>
          </div>
        </article>
      </section>

      <section className="module-list-card reports-history-card reports-history-card-premium">
        <div className="dashboard-inline-actions">
          <div>
            <p className="eyebrow">Historique</p>
            <h2>Rapports deja generes</h2>
          </div>
          <Badge variant={history.length ? 'success' : 'neutral'}>{history.length}</Badge>
        </div>
        <div className="module-catalog-grid">
          {history.length ? (
            history.map((item, index) => (
              <motion.article
                key={item.id}
              className="module-catalog-card reports-history-item reports-history-item-premium"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="module-card-top">
                  <p className="eyebrow">{item.reportType}</p>
                  <Badge variant={formatBadge(item.format)}>{item.format}</Badge>
                </div>
                <h2>{item.fileName}</h2>
                <div className="module-detail-list">
                  <span>Genere le {new Date(item.generatedAt).toLocaleString('fr-FR')}</span>
                  <span>Telechargement disponible sans regeneration</span>
                </div>
                <Button className="module-submit-button reports-action-button" type="button" variant="secondary" disabled={isPending} onClick={() => downloadHistoryItem(item)}>
                  <Download className="h-4 w-4" />
                  Telecharger
                </Button>
              </motion.article>
            ))
          ) : (
          <article className="module-catalog-card reports-history-item-premium module-empty-card">
              <div>
                <p className="eyebrow">Archives</p>
                <h2>Aucun rapport enregistre</h2>
                <p>Genere un premier document pour constituer l'historique des exports de la ferme.</p>
              </div>
            </article>
          )}
        </div>
      </section>

      {report ? (
        <>
          <section className="module-split-grid reports-summary-grid reports-summary-grid-premium">
            <article className="module-list-card reports-summary-card reports-summary-card-premium">
              <div className="dashboard-inline-actions">
                <div>
                  <p className="eyebrow">Synthese</p>
                  <h2>{report.reportType}</h2>
                </div>
                <Badge variant={formatBadge(report.format)}>{report.format}</Badge>
              </div>
              <p>{report.summary}</p>
              <div className="metric-list">
                <span>Fichier: {report.fileName}</span>
                <span>Genere le: {new Date(report.generatedAt).toLocaleString('fr-FR')}</span>
                <span>Mime: {report.mimeType}</span>
              </div>
            </article>

            <article className="module-list-card reports-summary-card reports-summary-card-premium">
              <div className="dashboard-inline-actions">
                <div>
                  <p className="eyebrow">Export</p>
                  <h2>Telechargement</h2>
                </div>
                <div className="farm-module-icon">
                  {report.format === 'PDF' ? <FileText className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
                </div>
              </div>
              <p>Le fichier genere est disponible en format reel et peut etre telecharge immediatement.</p>
              <Button className="module-submit-button reports-action-button" type="button" disabled={isPending} onClick={downloadReport}>
                Telecharger
              </Button>
            </article>
          </section>

          <section className="module-list-card reports-preview-card reports-preview-card-premium">
            <div className="dashboard-inline-actions">
              <div>
                <p className="eyebrow">Apercu</p>
                <h2>Sections du rapport</h2>
              </div>
              <Badge variant="success">{report.sections.length} section(s)</Badge>
            </div>
            <div className="module-catalog-grid">
              {report.sections.map((section, index) => (
                <motion.article
                  key={section.title}
                  className="module-catalog-card reports-section-card reports-section-card-premium"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <p className="eyebrow">Section</p>
                  <h2>{section.title}</h2>
                  <div className="module-detail-list">
                    {section.lines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="module-list-card module-empty-card reports-empty-card reports-empty-card-premium">
          <div>
            <p className="eyebrow">Apercu</p>
            <h2>Aucun rapport genere</h2>
            <p>Lance une premiere generation pour obtenir un document et un apercu exportable.</p>
          </div>
        </section>
      )}
    </AppShell>
  );
}
