'use client';

import { motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  Pencil,
  PlusCircle,
  Sparkles,
  Trash2,
  WalletCards
} from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { useToast } from '../../../../components/ui/toast-provider';
import { useSession } from '../../../../hooks/use-session';
import {
  createFinancialTransaction,
  deleteFinancialTransaction,
  getFarm,
  getFarmFinanceTransactions,
  type FinanceSummaryView,
  type FinancialTransactionView,
  type FinanceTransactionFilters,
  updateFinancialTransaction
} from '../../../../services/farm-client';

const emptySummary: FinanceSummaryView = {
  totalRevenue: 0,
  totalExpense: 0,
  balance: 0,
  marginRate: 0,
  averageRevenueTicket: 0,
  averageExpenseTicket: 0,
  currentMonthRevenue: 0,
  currentMonthExpense: 0,
  currentMonthBalance: 0,
  previousMonthBalance: 0,
  balanceTrend: 0,
  topExpenseCategory: null,
  topRevenueCategory: null
};

type FinanceFormState = {
  transactionType: FinancialTransactionView['transactionType'];
  category: string;
  amount: number;
  transactionDate: string;
  referenceModule: string;
  notes: string;
};

const defaultForm: FinanceFormState = {
  transactionType: 'REVENU',
  category: 'Vente',
  amount: 0,
  transactionDate: new Date().toISOString().slice(0, 10),
  referenceModule: 'MANUEL',
  notes: ''
};

const defaultFilters: FinanceTransactionFilters = {
  transactionType: 'ALL',
  from: '',
  to: '',
  category: ''
};

  const financeWorkflowSteps = [
  {
    title: 'Revenu',
    description: 'Relier les ventes et les rentrées à la ferme.',
    icon: ArrowUpRight
  },
  {
    title: 'Dépense',
    description: 'Qualifier chaque sortie avec son poste de charge.',
    icon: ArrowDownRight
  },
  {
    title: 'Solde',
    description: 'Lire immédiatement l’équilibre du compte ferme.',
    icon: Landmark
  },
  {
    title: 'Marge',
    description: 'Contrôler la rentabilité et la tendance mensuelle.',
    icon: Sparkles
  }
  ] as const;

const formatMoney = (value: number) => `${value.toFixed(2)}`;

export default function FarmFinancePage({
  params
}: {
  params: Promise<{ farmId: string }>;
}) {
  const session = useSession();
  const [isPending, startTransition] = useTransition();
  const [farmId, setFarmId] = useState('');
  const [farmName, setFarmName] = useState('Ferme');
  const [items, setItems] = useState<FinancialTransactionView[]>([]);
  const [summary, setSummary] = useState<FinanceSummaryView>(emptySummary);
  const [form, setForm] = useState<FinanceFormState>(defaultForm);
  const [filters, setFilters] = useState<FinanceTransactionFilters>(defaultFilters);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  function refresh(activeFarmId: string, token: string, activeFilters: FinanceTransactionFilters = filters) {
    return getFarmFinanceTransactions(activeFarmId, token, activeFilters).then((response) => {
      setItems(response.items);
      setSummary(response.summary);
    });
  }

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

    refresh(farmId, session.token, filters).catch(() => {
      setItems([]);
      setSummary(emptySummary);
    });
  }, [farmId, filters, session?.token]);

  function submitTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      return;
    }

    startTransition(async () => {
      try {
        if (editingTransactionId) {
          await updateFinancialTransaction(
            farmId,
            editingTransactionId,
            {
              ...form,
              referenceModule: form.referenceModule || undefined,
              notes: form.notes || undefined
            },
            session.token
          );
        } else {
          await createFinancialTransaction(
            farmId,
            {
              ...form,
              referenceModule: form.referenceModule || undefined,
              notes: form.notes || undefined
            },
            session.token
          );
        }
        setForm(defaultForm);
        setEditingTransactionId(null);
        setError(null);
        await refresh(farmId, session.token, filters);
        pushToast({
          title: editingTransactionId ? 'Transaction mise a jour' : 'Transaction enregistree',
          description: editingTransactionId
            ? `${form.transactionType} mise a jour dans les finances de la ferme.`
            : `${form.transactionType} ajoute aux finances de la ferme.`,
          variant: 'success'
        });
      } catch (submissionError) {
        const message =
          submissionError instanceof Error ? submissionError.message : 'Enregistrement impossible';
        setError(message);
        pushToast({
          title: 'Enregistrement impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  function startEditingTransaction(item: FinancialTransactionView) {
    setEditingTransactionId(item.id);
    setForm({
      transactionType: item.transactionType,
      category: item.category,
      amount: item.amount,
      transactionDate: item.transactionDate.slice(0, 10),
      referenceModule: item.referenceModule ?? '',
      notes: item.notes
    });
    setError(null);
  }

  function cancelEditingTransaction() {
    setEditingTransactionId(null);
    setForm(defaultForm);
    setError(null);
  }

  function handleDeleteTransaction(transactionId: string) {
    if (!session?.token || !window.confirm('Supprimer cette transaction financiere ?')) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteFinancialTransaction(farmId, transactionId, session.token);
        if (editingTransactionId === transactionId) {
          cancelEditingTransaction();
        }
        await refresh(farmId, session.token, filters);
        pushToast({
          title: 'Transaction supprimee',
          description: 'L ecriture a ete retiree du journal financier.',
          variant: 'success'
        });
      } catch (submissionError) {
        const message =
          submissionError instanceof Error ? submissionError.message : 'Suppression impossible';
        setError(message);
        pushToast({
          title: 'Suppression impossible',
          description: message,
          variant: 'error'
        });
      }
    });
  }

  return (
    <AppShell title={`Finances - ${farmName}`}>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="dashboard-hero-grid finance-hero-grid finance-hero-grid-premium">
        <article className="dashboard-hero-card finance-hero-card finance-hero-card-premium">
          <div className="dashboard-hero-top">
            <div>
              <p className="eyebrow">Pilotage financier</p>
              <h2 className="dashboard-hero-title">Une lecture plus nette des flux economiques</h2>
            </div>
            <Badge variant={summary.balance >= 0 ? 'success' : 'warning'}>
              {summary.balance >= 0 ? 'Rentable' : 'Sous tension'}
            </Badge>
          </div>
          <p className="hero-copy dashboard-hero-copy">
            Suivez les revenus, depenses et marges dans une presentation plus executive, plus
            lisible et plus rassurante.
          </p>
          <div className="dashboard-hero-pills">
            <span className="dashboard-hero-pill">
              <ArrowUpRight className="h-4 w-4" />
              {formatMoney(summary.totalRevenue)} revenus
            </span>
            <span className="dashboard-hero-pill">
              <ArrowDownRight className="h-4 w-4" />
              {formatMoney(summary.totalExpense)} depenses
            </span>
            <span className="dashboard-hero-pill">
              <Landmark className="h-4 w-4" />
              marge {summary.marginRate.toFixed(1)}%
            </span>
            <span className="dashboard-hero-pill">
              <Sparkles className="h-4 w-4" />
              tendance {summary.balanceTrend.toFixed(1)}%
            </span>
          </div>
          <div className="dashboard-hero-stat-grid finance-hero-grid">
            <article className="dashboard-hero-stat dashboard-hero-stat-accent">
              <span className="dashboard-hero-stat-label">Solde</span>
              <strong>{formatMoney(summary.balance)}</strong>
              <span>{summary.balance >= 0 ? 'Trésorerie positive' : 'Alerte équilibre'}</span>
            </article>
            <article className="dashboard-hero-stat">
              <span className="dashboard-hero-stat-label">Ticket moyen revenu</span>
              <strong>{formatMoney(summary.averageRevenueTicket)}</strong>
              <span>Lecture utile pour les ventes</span>
            </article>
            <article className="dashboard-hero-stat dashboard-hero-stat-muted">
              <span className="dashboard-hero-stat-label">Ticket moyen dépense</span>
              <strong>{formatMoney(summary.averageExpenseTicket)}</strong>
              <span>Sorties moyennes par écriture</span>
            </article>
          </div>
        </article>

        <article className="dashboard-spotlight-card finance-spotlight-card finance-spotlight-card-premium">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Synthese</p>
              <h2>{farmName}</h2>
            </div>
            <div className="farm-module-icon">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="metric-list">
            <span>Transactions: {items.length}</span>
            <span>Solde net: {summary.balance.toFixed(2)}</span>
            <span>Mois courant: {summary.currentMonthBalance.toFixed(2)}</span>
          </div>
          <div className="finance-mini-stack">
            <span className="status-pill">{summary.balance >= 0 ? 'Rentable' : 'Sous tension'}</span>
            <span className="finance-mini-note">
              {summary.topRevenueCategory
                ? `Top revenu: ${summary.topRevenueCategory.category}`
                : 'Aucune categorie de revenu dominante'}
            </span>
          </div>
        </article>
      </section>

      <section className="module-flow-strip finance-flow-strip">
        {financeWorkflowSteps.map((step, index) => {
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

      <section className="dashboard-kpi-grid">
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <Badge variant="success">Revenus</Badge>
          </div>
          <p className="eyebrow">Entrees</p>
          <strong className="metric-number">{formatMoney(summary.totalRevenue)}</strong>
          <span className="metric-delta">Volume de revenus saisis</span>
        </article>
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <ArrowDownRight className="h-5 w-5" />
            </div>
            <Badge variant="warning">Depenses</Badge>
          </div>
          <p className="eyebrow">Sorties</p>
          <strong className="metric-number">{formatMoney(summary.totalExpense)}</strong>
          <span className="metric-delta">Charges d exploitation</span>
        </article>
        <article className={`metric-tile dashboard-kpi-tile ${summary.balance < 0 ? 'alert-warning' : ''}`}>
          <div className="metric-header">
            <div className="metric-icon">
              <Landmark className="h-5 w-5" />
            </div>
            <Badge variant={summary.balance >= 0 ? 'success' : 'critical'}>Solde</Badge>
          </div>
          <p className="eyebrow">Resultat net</p>
          <strong className="metric-number">{formatMoney(summary.balance)}</strong>
          <span className="metric-delta">Marge nette {summary.marginRate.toFixed(1)}%</span>
        </article>
        <article className="metric-tile dashboard-kpi-tile">
          <div className="metric-header">
            <div className="metric-icon">
              <WalletCards className="h-5 w-5" />
            </div>
            <Badge variant={summary.balanceTrend >= 0 ? 'success' : 'warning'}>Tendance</Badge>
          </div>
          <p className="eyebrow">Variation mensuelle</p>
          <strong className="metric-number">{summary.balanceTrend.toFixed(1)}%</strong>
          <span className="metric-delta">
            M-1: {formatMoney(summary.previousMonthBalance)} / M: {formatMoney(summary.currentMonthBalance)}
          </span>
        </article>
      </section>

      <section className="dashboard-summary-grid finance-summary-grid finance-summary-grid-premium">
        <article className="panel dashboard-summary-card finance-summary-card finance-summary-card-premium">
          <div className="dashboard-inline-actions">
            <strong>Mois courant</strong>
            <Badge variant={summary.currentMonthBalance >= 0 ? 'success' : 'warning'}>
              {summary.currentMonthBalance >= 0 ? 'Equilibre' : 'Tension'}
            </Badge>
          </div>
          <div className="metric-list">
            <span>Revenus: {formatMoney(summary.currentMonthRevenue)}</span>
            <span>Depenses: {formatMoney(summary.currentMonthExpense)}</span>
            <span>Solde: {formatMoney(summary.currentMonthBalance)}</span>
          </div>
        </article>
        <article className="panel dashboard-summary-card finance-summary-card finance-summary-card-premium">
          <div className="dashboard-inline-actions">
            <strong>Categories dominantes</strong>
            <Badge variant="info">Analyse</Badge>
          </div>
          <div className="metric-list">
            <span>
              Top revenu: {summary.topRevenueCategory ? `${summary.topRevenueCategory.category} (${formatMoney(summary.topRevenueCategory.amount)})` : 'Aucun'}
            </span>
            <span>
              Top depense: {summary.topExpenseCategory ? `${summary.topExpenseCategory.category} (${formatMoney(summary.topExpenseCategory.amount)})` : 'Aucune'}
            </span>
            <span>
              Ticket moyen revenu/depense: {formatMoney(summary.averageRevenueTicket)} / {formatMoney(summary.averageExpenseTicket)}
            </span>
          </div>
        </article>
      </section>

      {session?.user.role === 'ADMIN' ? (
        <section className="panel create-panel farm-management-panel finance-form-panel">
          <div className="dashboard-inline-actions">
            <div>
              <p className="eyebrow">Nouvelle transaction</p>
              <h2 className="farms-section-title">Enregistrer une ecriture financiere</h2>
            </div>
            <div className="farm-module-icon">
              <PlusCircle className="h-5 w-5" />
            </div>
          </div>
          <form className="stack-form" onSubmit={submitTransaction}>
            <div className="field-grid">
              <label className="field">
                <span>Type</span>
                <select
                  value={form.transactionType}
                  onChange={(input) =>
                    setForm((current) => ({
                      ...current,
                      transactionType: input.target.value as FinancialTransactionView['transactionType']
                    }))
                  }
                >
                  <option value="REVENU">Revenu</option>
                  <option value="DEPENSE">Depense</option>
                </select>
              </label>
              <label className="field">
                <span>Categorie</span>
                <input
                  value={form.category}
                  onChange={(input) => setForm((current) => ({ ...current, category: input.target.value }))}
                />
              </label>
              <label className="field">
                <span>Montant</span>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(input) => setForm((current) => ({ ...current, amount: Number(input.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Date</span>
                <input
                  type="date"
                  value={form.transactionDate}
                  onChange={(input) =>
                    setForm((current) => ({ ...current, transactionDate: input.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Module source</span>
                <input
                  value={form.referenceModule}
                  onChange={(input) =>
                    setForm((current) => ({ ...current, referenceModule: input.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Notes</span>
                <input
                  value={form.notes}
                  onChange={(input) => setForm((current) => ({ ...current, notes: input.target.value }))}
                />
              </label>
            </div>
            <div className="hero-actions finance-form-actions">
              <Button className="module-submit-button finance-action-button finance-action-button-primary" type="submit" disabled={isPending}>
                {editingTransactionId ? 'Mettre a jour la transaction' : 'Enregistrer la transaction'}
              </Button>
              {editingTransactionId ? (
                <Button className="module-submit-button finance-action-button finance-action-button-secondary" variant="secondary" type="button" onClick={cancelEditingTransaction}>
                  Annuler la modification
                </Button>
              ) : null}
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel dashboard-summary-card finance-filter-card finance-filter-card-premium">
        <div className="dashboard-inline-actions">
          <div>
            <p className="eyebrow">Filtres</p>
            <h2>Affiner le journal financier</h2>
          </div>
          <Badge variant="info">Vue dynamique</Badge>
        </div>
        <div className="field-grid">
          <label className="field">
            <span>Type</span>
            <select
              value={filters.transactionType ?? 'ALL'}
              onChange={(input) =>
                setFilters((current) => ({
                  ...current,
                  transactionType: input.target.value as FinanceTransactionFilters['transactionType']
                }))
              }
            >
              <option value="ALL">Tous</option>
              <option value="REVENU">Revenus</option>
              <option value="DEPENSE">Depenses</option>
            </select>
          </label>
          <label className="field">
            <span>Du</span>
            <input
              type="date"
              value={filters.from ?? ''}
              onChange={(input) => setFilters((current) => ({ ...current, from: input.target.value }))}
            />
          </label>
          <label className="field">
            <span>Au</span>
            <input
              type="date"
              value={filters.to ?? ''}
              onChange={(input) => setFilters((current) => ({ ...current, to: input.target.value }))}
            />
          </label>
          <label className="field">
            <span>Categorie</span>
            <input
              value={filters.category ?? ''}
              onChange={(input) =>
                setFilters((current) => ({ ...current, category: input.target.value }))
              }
              placeholder="Vente, aliment, carburant..."
            />
          </label>
        </div>
        <div className="hero-actions finance-filter-actions">
          <Button className="module-submit-button finance-action-button finance-action-button-secondary" variant="secondary" type="button" onClick={() => setFilters(defaultFilters)}>
            Reinitialiser les filtres
          </Button>
        </div>
      </section>

      <section className="panel dashboard-alerts-panel finance-ledger-panel finance-ledger-panel-premium">
        <div className="dashboard-inline-actions">
          <div>
            <p className="eyebrow">Historique</p>
            <h2>Journal financier</h2>
          </div>
          <Badge variant={summary.balance >= 0 ? 'success' : 'warning'}>
            {summary.balance >= 0 ? 'Rentable' : 'Sous tension'}
          </Badge>
        </div>
        {items.length ? (
          <div className="finance-ledger">
            {items.map((item, index) => (
              <motion.article
                key={item.id}
                className={`table-row finance-ledger-row finance-ledger-item finance-ledger-item-premium ${item.transactionType === 'DEPENSE' ? 'alert-warning' : 'alert-info'}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <div className="finance-ledger-top">
                  <div>
                    <strong>{item.category}</strong>
                    <p className="finance-ledger-meta">{new Date(item.transactionDate).toLocaleDateString('fr-FR')} • {item.referenceModule || 'MANUEL'}</p>
                  </div>
                  <Badge variant={item.transactionType === 'DEPENSE' ? 'warning' : 'success'}>
                    {item.transactionType}
                  </Badge>
                </div>
                <div className="finance-ledger-body">
                  <span className="finance-ledger-amount">{formatMoney(item.amount)}</span>
                  <span>{item.notes || 'Sans note'}</span>
                  <span>Par {item.recordedByUserName}</span>
                </div>
                {session?.user.role === 'ADMIN' ? (
                  <div className="hero-actions finance-ledger-actions">
                    <Button className="module-submit-button finance-action-button finance-action-button-secondary" variant="ghost" type="button" onClick={() => startEditingTransaction(item)}>
                      <Pencil className="h-4 w-4" />
                      Modifier
                    </Button>
                    <Button
                      className="module-submit-button finance-action-button finance-action-button-ghost"
                      variant="ghost"
                      type="button"
                      onClick={() => handleDeleteTransaction(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                  </div>
                ) : null}
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="table-row finance-empty-row">
            <WalletCards className="h-5 w-5 text-[var(--muted-soft)]" />
            <p className="muted">Aucune transaction financiere enregistree.</p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
