import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Fish, PackageCheck, PauseCircle, Plus, Save } from 'lucide-react';
import { FishBassin, FishFeedPlan, StockArticle, UserRole } from '../types';
import FormDialog from './FormDialog';

export type FishFeedPlanInput = {
  bassinId: string;
  articleId: string;
  planName: string;
  rationMode: 'fixed_kg' | 'biomass_percent';
  rationValue: number;
  feedingsPerDay: number;
  startDate: string;
  endDate?: string;
  notes?: string;
};

type Props = {
  role: UserRole;
  bassins: FishBassin[];
  articles: StockArticle[];
  plans: FishFeedPlan[];
  currency: string;
  onCreate: (plan: FishFeedPlanInput) => void | Promise<void>;
  onUpdate: (planId: string, plan: FishFeedPlanInput) => void | Promise<void>;
  onDeactivate: (planId: string) => void | Promise<void>;
};

const today = () => new Date().toISOString().slice(0, 10);

const formatNumber = (value: number, digits = 2) => new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: digits,
}).format(value);

export default function FishNutritionPlanPanel({
  role, bassins, articles, plans, currency, onCreate, onUpdate, onDeactivate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<FishFeedPlan | null>(null);
  const [bassinId, setBassinId] = useState('');
  const [articleId, setArticleId] = useState('');
  const [planName, setPlanName] = useState('Plan d’alimentation');
  const [rationMode, setRationMode] = useState<FishFeedPlanInput['rationMode']>('fixed_kg');
  const [rationValue, setRationValue] = useState(1);
  const [feedingsPerDay, setFeedingsPerDay] = useState(2);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const activeArticles = useMemo(() => articles.filter((article) => article.isActive !== false), [articles]);
  const activePlans = plans.filter((plan) => plan.isActive);
  const selectedBassin = bassins.find((bassin) => bassin.id === bassinId);
  const selectedArticle = activeArticles.find((article) => article.id === articleId);
  const dailyQuantity = rationMode === 'biomass_percent'
    ? ((selectedBassin?.biomassKg ?? 0) * rationValue) / 100
    : rationValue;
  const coverageDays = dailyQuantity > 0 && selectedArticle ? selectedArticle.quantity / dailyQuantity : 0;

  useEffect(() => {
    if (!bassinId && bassins[0]) setBassinId(bassins[0].id);
    if (!articleId && activeArticles[0]) setArticleId(activeArticles[0].id);
  }, [activeArticles, articleId, bassinId, bassins]);

  const reset = () => {
    setOpen(false);
    setEditingPlan(null);
    setPlanName('Plan d’alimentation');
    setRationMode('fixed_kg');
    setRationValue(1);
    setFeedingsPerDay(2);
    setStartDate(today());
    setEndDate('');
    setNotes('');
  };

  const edit = (plan: FishFeedPlan) => {
    setEditingPlan(plan);
    setBassinId(plan.bassinId);
    setArticleId(plan.articleId ?? '');
    setPlanName(plan.planName);
    setRationMode(plan.rationMode);
    setRationValue(plan.rationValue);
    setFeedingsPerDay(plan.feedingsPerDay);
    setStartDate(plan.startDate || today());
    setEndDate(plan.endDate ?? '');
    setNotes(plan.notes ?? '');
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bassinId || !articleId || !planName.trim() || dailyQuantity <= 0) return;
    const payload: FishFeedPlanInput = {
      bassinId, articleId, planName: planName.trim(), rationMode, rationValue,
      feedingsPerDay, startDate, endDate: endDate || undefined, notes: notes.trim() || undefined,
    };
    if (editingPlan) await onUpdate(editingPlan.id, payload);
    else await onCreate(payload);
    reset();
  };

  return (
    <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm" aria-labelledby="fish-nutrition-title">
      <FormDialog
        open={open}
        title={editingPlan ? 'Remplacer le plan alimentaire' : 'Programmer l’alimentation'}
        subtitle="Le stock n’est pas retiré maintenant : chaque tâche devra être confirmée avec la quantité réellement distribuée."
        confirmLabel={editingPlan ? 'Enregistrer le nouveau plan' : 'Créer le plan'}
        confirmDisabled={!bassinId || !articleId || !planName.trim() || dailyQuantity <= 0}
        onCancel={reset}
        onSubmit={submit}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Bassin</span>
            <select value={bassinId} onChange={(event) => setBassinId(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100">
              <option value="">Choisir un bassin</option>{bassins.filter((bassin) => bassin.status === 'active').map((bassin) => <option key={bassin.id} value={bassin.id}>{bassin.name} · biomasse {formatNumber(bassin.biomassKg ?? 0)} kg</option>)}
            </select>
          </label>
          <label className="space-y-1.5"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Aliment / intrant</span>
            <select value={articleId} onChange={(event) => setArticleId(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100">
              <option value="">Choisir dans le stock</option>{activeArticles.map((article) => <option key={article.id} value={article.id}>{article.name} · {formatNumber(article.quantity)} {article.unit}</option>)}
            </select>
          </label>
          <label className="space-y-1.5"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Nom du plan</span><input value={planName} onChange={(event) => setPlanName(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100" /></label>
          <label className="space-y-1.5"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Méthode de calcul</span>
            <select value={rationMode} onChange={(event) => setRationMode(event.target.value as FishFeedPlanInput['rationMode'])} className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"><option value="fixed_kg">Quantité fixe (kg/jour)</option><option value="biomass_percent">Pourcentage de biomasse</option></select>
          </label>
          <label className="space-y-1.5"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">{rationMode === 'biomass_percent' ? 'Pourcentage de biomasse' : 'Quantité par jour (kg)'}</span><input type="number" min="0.001" step="0.001" value={rationValue} onChange={(event) => setRationValue(Number(event.target.value))} className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100" /></label>
          <label className="space-y-1.5"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Distributions / jour</span><input type="number" min="1" max="12" value={feedingsPerDay} onChange={(event) => setFeedingsPerDay(Number(event.target.value))} className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100" /></label>
          <label className="space-y-1.5"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Début</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100" /></label>
          <label className="space-y-1.5"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Fin (facultative)</span><input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100" /></label>
          <label className="space-y-1.5 md:col-span-2"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Consigne (facultative)</span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex. distribuer en trois passages réguliers" className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100" /></label>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-xs sm:grid-cols-3">
          <div><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">Besoin journalier</span><p className="mt-1 text-base font-bold text-sky-950">{formatNumber(dailyQuantity, 3)} kg</p><p className="text-[11px] text-sky-800">{feedingsPerDay} distributions à confirmer.</p></div>
          <div><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">Projection 30 jours</span><p className="mt-1 text-base font-bold text-sky-950">{formatNumber(dailyQuantity * 30, 1)} kg</p><p className="text-[11px] text-sky-800">{formatNumber(dailyQuantity * (selectedArticle?.unitCost ?? 0) * 30, 0)} {currency} estimés.</p></div>
          <div><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">Couverture du stock</span><p className="mt-1 text-base font-bold text-sky-950">{coverageDays ? `${formatNumber(coverageDays, 1)} jours` : 'À calculer'}</p><p className="text-[11px] text-sky-800">{selectedArticle ? `${formatNumber(selectedArticle.quantity)} ${selectedArticle.unit} disponibles.` : 'Sélectionnez un intrant.'}</p></div>
        </div>
      </FormDialog>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3"><span className="rounded-xl bg-sky-50 p-2.5 text-sky-600"><Fish className="h-5 w-5" /></span><div><h3 id="fish-nutrition-title" className="text-sm font-bold text-slate-900">Plans d’alimentation piscicole</h3><p className="mt-0.5 text-xs text-slate-500">Une tâche quotidienne regroupe les distributions prévues ; le réel garde la priorité.</p></div></div>
        {role === 'admin' && <button type="button" onClick={() => setOpen(true)} disabled={bassins.length === 0 || activeArticles.length === 0} className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-700 bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-900/20 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"><Plus className="h-3.5 w-3.5" /> Nouveau plan</button>}
      </div>

      {activePlans.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">Aucun plan actif. Créez un plan pour générer les 30 prochains jours de tâches sans retirer le stock à l’avance.</p> : <div className="mt-4 grid gap-3 lg:grid-cols-2">{activePlans.map((plan) => {
        const article = articles.find((item) => item.id === plan.articleId); const coverage = plan.targetDailyQuantityKg > 0 ? (article?.quantity ?? 0) / plan.targetDailyQuantityKg : 0;
        return <article key={plan.id} className="rounded-xl border border-sky-100 bg-sky-50/40 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">{plan.planName}</p><p className="mt-0.5 text-xs text-slate-600">{plan.bassinName || 'Bassin'} · {plan.articleName || 'Intrant à choisir'}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">Actif</span></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><span className="text-slate-500">Jour</span><p className="font-bold text-slate-900">{formatNumber(plan.targetDailyQuantityKg, 3)} kg</p></div><div><span className="text-slate-500">Rythme</span><p className="font-bold text-slate-900">{plan.feedingsPerDay} passages</p></div><div><span className="text-slate-500">Couverture</span><p className={coverage < 30 ? 'font-bold text-amber-700' : 'font-bold text-slate-900'}>{formatNumber(coverage, 1)} j</p></div></div><p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-600"><CalendarDays className="h-3.5 w-3.5 text-sky-600" />Du {plan.startDate}{plan.endDate ? ` au ${plan.endDate}` : ' sans date de fin'}</p>{role === 'admin' && <div className="mt-3 flex gap-2"><button type="button" onClick={() => edit(plan)} className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-sky-700"><Save className="h-3 w-3" /> Modifier</button><button type="button" onClick={() => onDeactivate(plan.id)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600"><PauseCircle className="h-3 w-3" /> Arrêter</button></div>}</article>;
      })}</div>}
      {role === 'admin' && (bassins.length === 0 || activeArticles.length === 0) && <p className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-700"><PackageCheck className="h-3.5 w-3.5" />Créez d’abord un bassin actif et un intrant en stock pour programmer l’alimentation.</p>}
    </section>
  );
}
