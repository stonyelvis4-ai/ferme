/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Egg,
  Fish,
  Sprout,
  Package,
  DollarSign,
  Calendar,
  CheckSquare,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import {
  Lot,
  EggProduction,
  FishBassin,
  CultureParcelle,
  StockArticle,
  FinanceTransaction,
  Task,
  Alert
} from '../types';

interface DashboardViewProps {
  lots: Lot[];
  eggProductions: EggProduction[];
  fishBassins: FishBassin[];
  parcelles: CultureParcelle[];
  articles: StockArticle[];
  transactions: FinanceTransaction[];
  tasks: Task[];
  alerts: Alert[];
  currency: string;
  areaUnit: string;
  onNavigate: (view: string) => void;
}

export default function DashboardView({
  lots,
  eggProductions,
  fishBassins,
  parcelles,
  articles,
  transactions,
  tasks,
  alerts,
  currency,
  areaUnit,
  onNavigate
}: DashboardViewProps) {
  const income = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expenses = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const netProfit = income - expenses;
  const activeLotsCount = lots.filter((lot) => lot.status === 'active').length;
  const activeBassinsCount = fishBassins.filter((bassin) => bassin.status === 'active').length;
  const cultivatedPlots = parcelles.filter((parcelle) => parcelle.status === 'cultivated');
  const cultivatedArea = cultivatedPlots.reduce((sum, parcelle) => sum + parcelle.area, 0);
  const totalFishCount = fishBassins.reduce((sum, bassin) => sum + bassin.currentCount, 0);
  const avgSurvivalRate = lots.length > 0
    ? lots.reduce((sum, lot) => sum + (lot.initialCount > 0 ? (lot.currentCount / lot.initialCount) * 100 : 0), 0) / lots.length
    : 0;
  const latestProduction = eggProductions.length > 0 ? eggProductions[eggProductions.length - 1] : null;
  const eggsToday = latestProduction?.collectedCount ?? 0;
  const latestQualityRate = latestProduction
    ? (latestProduction.compliantCount / Math.max(latestProduction.collectedCount, 1)) * 100
    : 0;
  const pendingTasks = tasks.filter((task) => task.status === 'todo' || task.status === 'in_progress');
  const overdueTasksCount = tasks.filter((task) => task.status === 'overdue').length;
  const activeAlerts = alerts.filter((alert) => !alert.read);
  const stockAlerts = articles.filter((article) => article.quantity <= (article.minimumStock ?? article.minThreshold ?? 0)).length;

  const expenseBreakdown = Object.entries(
    transactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce<Record<string, number>>((acc, transaction) => {
        acc[transaction.category] = (acc[transaction.category] ?? 0) + transaction.amount;
        return acc;
      }, {})
  )
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalExpenseAmount = expenseBreakdown.reduce((sum, item) => sum + item.amount, 0);

  const formatCurrency = (value: number) =>
    `${new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      maximumFractionDigits: 0
    }).format(value)} ${currency}`;

  const isEmpty =
    lots.length === 0 &&
    eggProductions.length === 0 &&
    fishBassins.length === 0 &&
    parcelles.length === 0 &&
    articles.length === 0 &&
    transactions.length === 0 &&
    tasks.length === 0 &&
    alerts.length === 0;

  return (
    <div id="dashboard-view" className="space-y-6">
      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-800">
            Votre tableau de bord est prêt, mais la ferme ne contient pas encore de données opérationnelles.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Commencez par créer un lot, une parcelle, un bassin, un stock ou une tâche pour alimenter les indicateurs.
          </p>
        </div>
      ) : null}

      {!isEmpty ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Résultat net</span>
            <span className={`mt-2 block text-xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(netProfit)}</span>
            <p className="mt-1 text-xs text-slate-500">Différence entre revenus et dépenses enregistrés.</p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">Cheptel aquacole</span>
            <span className="mt-2 block text-xl font-bold text-sky-900">{totalFishCount.toLocaleString('fr-FR')}</span>
            <p className="mt-1 text-xs text-sky-800">Poissons actuellement suivis dans les bassins.</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Stocks sensibles</span>
            <span className="mt-2 block text-xl font-bold text-amber-900">{stockAlerts}</span>
            <p className="mt-1 text-xs text-amber-800">Articles proches ou sous leur seuil d'alerte.</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-700">Vigilance</span>
            <span className="mt-2 block text-xl font-bold text-rose-900">{activeAlerts.length + overdueTasksCount}</span>
            <p className="mt-1 text-xs text-rose-800">Total des alertes ouvertes et tâches en retard.</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <button
          id="kpi-lots"
          type="button"
          onClick={() => onNavigate('élevage')}
          className="group rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:border-emerald-500/40 hover:shadow"
        >
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-emerald-50 p-2.5 transition-colors group-hover:bg-emerald-100">
              <Activity className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-slate-400">Élevage</span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">{activeLotsCount}</h3>
            <p className="mt-1 text-xs text-slate-500">Lots actifs</p>
            <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2.5 text-[11px]">
              <span className="font-semibold text-emerald-600">{avgSurvivalRate.toFixed(1)}% survie</span>
              <span className="text-slate-400">Voir les lots</span>
            </div>
          </div>
        </button>

        <button
          id="kpi-eggs"
          type="button"
          onClick={() => onNavigate('pondeuses')}
          className="group rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:border-amber-500/40 hover:shadow"
        >
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-amber-50 p-2.5 transition-colors group-hover:bg-amber-100">
              <Egg className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-slate-400">Pondeuses</span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">{eggsToday.toLocaleString('fr-FR')}</h3>
            <p className="mt-1 text-xs text-slate-500">Oeufs collectés</p>
            <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2.5 text-[11px]">
              <span className="font-semibold text-amber-600">Qualité : {latestQualityRate.toFixed(1)}%</span>
              <span className="text-slate-400">Consulter</span>
            </div>
          </div>
        </button>

        <button
          id="kpi-fish"
          type="button"
          onClick={() => onNavigate('pisciculture')}
          className="group rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:border-sky-500/40 hover:shadow"
        >
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-sky-50 p-2.5 transition-colors group-hover:bg-sky-100">
              <Fish className="h-5 w-5 text-sky-600" />
            </div>
            <span className="text-xs font-medium text-slate-400">Pisciculture</span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">{activeBassinsCount}</h3>
            <p className="mt-1 text-xs text-slate-500">Bassins actifs</p>
            <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2.5 text-[11px]">
              <span className="font-semibold text-sky-600">{totalFishCount.toLocaleString('fr-FR')} poissons</span>
              <span className="text-slate-400">Voir les bassins</span>
            </div>
          </div>
        </button>

        <button
          id="kpi-crops"
          type="button"
          onClick={() => onNavigate('cultures')}
          className="group rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:border-lime-500/40 hover:shadow"
        >
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-lime-50 p-2.5 transition-colors group-hover:bg-lime-100">
              <Sprout className="h-5 w-5 text-lime-600" />
            </div>
            <span className="text-xs font-medium text-slate-400">Cultures</span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">
              {cultivatedArea.toFixed(1)} {areaUnit}
            </h3>
            <p className="mt-1 text-xs text-slate-500">Superficie cultivée</p>
            <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2.5 text-[11px]">
              <span className="font-semibold text-lime-600">{cultivatedPlots.length} parcelle(s) active(s)</span>
              <span className="text-slate-400">Parcelles</span>
            </div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-sans text-base font-bold tracking-tight text-slate-900">
                  Vue d&apos;ensemble financière
                </h3>
                <p className="text-xs text-slate-500">Synthèse calculée à partir des opérations enregistrées.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('finances')}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Gérer la trésorerie
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Revenus</span>
                </div>
                <div className="truncate text-lg font-bold text-slate-900">{formatCurrency(income)}</div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                  <span>Dépenses</span>
                </div>
                <div className="truncate text-lg font-bold text-slate-900">{formatCurrency(expenses)}</div>
              </div>

              <div
                className={`rounded-xl border p-4 ${
                  netProfit >= 0 ? 'border-emerald-100 bg-emerald-50/50' : 'border-rose-100 bg-rose-50/50'
                }`}
              >
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <DollarSign className={`h-3.5 w-3.5 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
                  <span>Résultat net</span>
                </div>
                <div className={`truncate text-lg font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(netProfit)}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Structure des dépenses
              </h4>
              <div className="space-y-3">
                {expenseBreakdown.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-xs text-slate-400">
                    Aucune dépense enregistrée pour le moment.
                  </div>
                ) : (
                  expenseBreakdown.slice(0, 4).map((item, index) => {
                    const percentage = totalExpenseAmount > 0 ? Math.round((item.amount / totalExpenseAmount) * 100) : 0;
                    const barColor = ['bg-emerald-500', 'bg-amber-500', 'bg-slate-400', 'bg-sky-500'][index % 4];

                    return (
                      <div key={`${item.category}-${index}`} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700">{item.category}</span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(item.amount)} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className={`${barColor} h-full rounded-full`} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Package className="h-5 w-5 text-emerald-600" />
                  Contrôle des stocks
                </h3>
                <p className="text-xs text-slate-500">Articles surveillés selon les seuils réels du stock.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('stocks')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Inventaire complet ({articles.length})
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {articles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-xs text-slate-400 md:col-span-2">
                  Aucun article de stock enregistré.
                </div>
              ) : (
                articles.map((article) => {
                  const percentage = article.minThreshold > 0 ? (article.quantity / (article.minThreshold * 2)) * 100 : 100;
                  const isLow = article.quantity <= article.minThreshold;

                  return (
                    <div
                      key={article.id}
                      className={`rounded-xl border p-3.5 transition-colors ${
                        isLow ? 'border-amber-200/60 bg-amber-50/40' : 'border-slate-100 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-semibold text-slate-800">{article.name}</span>
                          <div className="mt-0.5 text-[10px] uppercase text-slate-400">{article.category}</div>
                        </div>
                        <span className={`text-xs font-bold ${isLow ? 'text-amber-600' : 'text-slate-600'}`}>
                          {article.quantity} {article.unit}
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                          <div
                            className={`h-full rounded-full ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                          <span>
                            Seuil : {article.minThreshold} {article.unit}
                          </span>
                          {isLow ? (
                            <span className="flex items-center gap-0.5 font-medium text-amber-600">
                              <AlertTriangle className="h-3 w-3" />
                              Réapprovisionner
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-bold text-slate-900">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Alertes ({activeAlerts.length})
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('alertes')}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                Tout voir
              </button>
            </div>

            <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
              {activeAlerts.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Aucune alerte active sur l&apos;exploitation.
                </div>
              ) : (
                activeAlerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className={`relative overflow-hidden rounded-xl border p-3 text-xs ${
                      alert.severity === 'critical'
                        ? 'border-rose-100 bg-rose-50 text-rose-900'
                        : 'border-amber-100 bg-amber-50 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {alert.title}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{alert.description}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Module : {alert.sourceModule || 'Général'}</span>
                      <span>{new Date(alert.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-bold text-slate-900">
                <CheckSquare className="h-4 w-4 text-emerald-600" />
                Tâches ({pendingTasks.length})
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('tâches')}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                Organiseur
              </button>
            </div>

            <div className="space-y-3">
              {pendingTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Aucune tâche restante pour aujourd&apos;hui.
                </div>
              ) : (
                pendingTasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-slate-800">{task.title}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          task.priority === 'critical'
                            ? 'bg-rose-100 text-rose-700'
                            : task.priority === 'high'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">{task.description}</p>
                    <div className="mt-2.5 flex justify-between border-t border-slate-100/50 pt-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        Échéance : {task.dueDate}
                      </span>
                      {task.assignedTo ? <span>Par : {task.assignedTo}</span> : null}
                    </div>
                  </div>
                ))
              )}

              {overdueTasksCount > 0 ? (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <div>
                    <span className="font-bold">{overdueTasksCount} tâche(s) en retard</span>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      Priorisez les opérations les plus urgentes depuis l&apos;agenda ou le module concerné.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
