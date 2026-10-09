import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Leaf, PackageCheck, PauseCircle, Plus, Save } from 'lucide-react';
import { Campaign, CropNutritionPlan, CultureParcelle, StockArticle, UserRole } from '../types';
import FormDialog from './FormDialog';

export type CropNutritionPlanInput = {
  campaignId: string;
  parcelleId: string;
  articleId: string;
  planName: string;
  doseKgPerHectare: number;
  applicationDates: string[];
  notes?: string;
};

type Props = {
  role: UserRole;
  campaigns: Campaign[];
  parcelles: CultureParcelle[];
  articles: StockArticle[];
  plans: CropNutritionPlan[];
  currency: string;
  onCreate: (plan: CropNutritionPlanInput) => void | Promise<void>;
  onUpdate: (planId: string, plan: CropNutritionPlanInput) => void | Promise<void>;
  onDeactivate: (planId: string) => void | Promise<void>;
};

const today = () => new Date().toISOString().slice(0, 10);
const number = (value: number, digits = 2) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value);

export default function CropNutritionPlanPanel({ role, campaigns, parcelles, articles, plans, currency, onCreate, onUpdate, onDeactivate }: Props) {
  const [open, setOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CropNutritionPlan | null>(null);
  const [campaignId, setCampaignId] = useState('');
  const [parcelleId, setParcelleId] = useState('');
  const [articleId, setArticleId] = useState('');
  const [planName, setPlanName] = useState('Plan de fertilisation');
  const [doseKgPerHectare, setDoseKgPerHectare] = useState(20);
  const [applicationDatesText, setApplicationDatesText] = useState(today());
  const [notes, setNotes] = useState('');

  const activeArticles = useMemo(() => articles.filter((article) => article.isActive !== false), [articles]);
  const activePlans = plans.filter((plan) => plan.isActive);
  const selectedCampaign = campaigns.find((campaign) => campaign.id === campaignId);
  const selectedParcelle = parcelles.find((parcelle) => parcelle.id === parcelleId);
  const selectedArticle = activeArticles.find((article) => article.id === articleId);
  const dates = applicationDatesText.split(/[\s,;]+/).map((value) => value.trim()).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
  const quantityPerApplication = doseKgPerHectare * (selectedParcelle?.area ?? 0);
  const coverageApplications = quantityPerApplication > 0 && selectedArticle ? selectedArticle.quantity / quantityPerApplication : 0;

  useEffect(() => {
    if (!campaignId && campaigns[0]) setCampaignId(campaigns[0].id);
    if (!articleId && activeArticles[0]) setArticleId(activeArticles[0].id);
  }, [activeArticles, articleId, campaignId, campaigns]);
  useEffect(() => {
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (campaign && campaign.parcelleId !== parcelleId) setParcelleId(campaign.parcelleId);
  }, [campaignId, campaigns, parcelleId]);

  const reset = () => {
    setOpen(false); setEditingPlan(null); setPlanName('Plan de fertilisation'); setDoseKgPerHectare(20); setApplicationDatesText(today()); setNotes('');
  };
  const edit = (plan: CropNutritionPlan) => {
    setEditingPlan(plan); setCampaignId(plan.campaignId); setParcelleId(plan.parcelleId); setArticleId(plan.articleId ?? ''); setPlanName(plan.planName); setDoseKgPerHectare(plan.doseKgPerHectare); setApplicationDatesText(plan.applicationDates.join(', ')); setNotes(plan.notes ?? ''); setOpen(true);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!campaignId || !parcelleId || !articleId || !planName.trim() || doseKgPerHectare <= 0 || dates.length === 0) return;
    const payload: CropNutritionPlanInput = { campaignId, parcelleId, articleId, planName: planName.trim(), doseKgPerHectare, applicationDates: dates, notes: notes.trim() || undefined };
    if (editingPlan) await onUpdate(editingPlan.id, payload); else await onCreate(payload);
    reset();
  };

  return <section className="rounded-2xl border border-lime-100 bg-white p-4 shadow-sm" aria-labelledby="crop-nutrition-title">
    <FormDialog open={open} title={editingPlan ? 'Remplacer le plan de fertilisation' : 'Planifier un apport nutritionnel'} subtitle="Les doses restent sous votre contrôle. L’application crée les tâches, puis une validation du réel retire le stock et trace l’opération." confirmLabel={editingPlan ? 'Enregistrer le nouveau plan' : 'Créer le plan'} confirmDisabled={!campaignId || !parcelleId || !articleId || !planName.trim() || doseKgPerHectare <= 0 || dates.length === 0} onCancel={reset} onSubmit={submit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1.5"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Campagne</span><select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-lime-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100"><option value="">Choisir une campagne</option>{campaigns.filter((campaign) => campaign.status !== 'cancelled' && campaign.status !== 'harvested').map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.cropType} · {campaign.variety}</option>)}</select></label>
        <label className="space-y-1.5"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Parcelle</span><select value={parcelleId} onChange={(event) => setParcelleId(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-lime-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100"><option value="">Choisir une parcelle</option>{parcelles.map((parcelle) => <option key={parcelle.id} value={parcelle.id}>{parcelle.name} · {number(parcelle.area)} ha</option>)}</select></label>
        <label className="space-y-1.5"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Intrant / fertilisant</span><select value={articleId} onChange={(event) => setArticleId(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-lime-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100"><option value="">Choisir dans le stock</option>{activeArticles.map((article) => <option key={article.id} value={article.id}>{article.name} · {number(article.quantity)} {article.unit}</option>)}</select></label>
        <label className="space-y-1.5"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Nom du plan</span><input value={planName} onChange={(event) => setPlanName(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-lime-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100" /></label>
        <label className="space-y-1.5"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Dose (kg / ha)</span><input type="number" min="0.001" step="0.001" value={doseKgPerHectare} onChange={(event) => setDoseKgPerHectare(Number(event.target.value))} className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-lime-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100" /></label>
        <label className="space-y-1.5"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Dates d’application</span><input value={applicationDatesText} onChange={(event) => setApplicationDatesText(event.target.value)} placeholder="2026-10-02, 2026-10-16" className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-lime-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100" /><span className="block text-[10px] text-slate-500">Séparez les dates par une virgule.</span></label>
        <label className="space-y-1.5 md:col-span-2"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Consigne (facultative)</span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex. apport localisé après désherbage" className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-lime-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100" /></label>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-lime-100 bg-lime-50/70 p-4 text-xs sm:grid-cols-3"><div><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-lime-700">Par application</span><p className="mt-1 text-base font-bold text-lime-950">{number(quantityPerApplication, 3)} kg</p><p className="text-[11px] text-lime-800">{number(doseKgPerHectare, 3)} kg/ha × {number(selectedParcelle?.area ?? 0)} ha.</p></div><div><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-lime-700">Planifié</span><p className="mt-1 text-base font-bold text-lime-950">{dates.length} application{dates.length > 1 ? 's' : ''}</p><p className="text-[11px] text-lime-800">{number(quantityPerApplication * dates.length, 1)} kg · {number(quantityPerApplication * dates.length * (selectedArticle?.unitCost ?? 0), 0)} {currency}.</p></div><div><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-lime-700">Couverture du stock</span><p className="mt-1 text-base font-bold text-lime-950">{coverageApplications ? `${number(coverageApplications, 1)} apports` : 'À calculer'}</p><p className="text-[11px] text-lime-800">{selectedArticle ? `${number(selectedArticle.quantity)} ${selectedArticle.unit} disponibles.` : 'Sélectionnez un intrant.'}</p></div></div>
    </FormDialog>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="rounded-xl bg-lime-50 p-2.5 text-lime-700"><Leaf className="h-5 w-5" /></span><div><h3 id="crop-nutrition-title" className="text-sm font-bold text-slate-900">Plans de fertilisation et nutrition</h3><p className="mt-0.5 text-xs text-slate-500">Les applications choisies génèrent des tâches ponctuelles : aucune sortie de stock avant validation.</p></div></div>{role === 'admin' && <button type="button" onClick={() => setOpen(true)} disabled={campaigns.length === 0 || parcelles.length === 0 || activeArticles.length === 0} className="inline-flex items-center justify-center gap-2 rounded-full border border-lime-700 bg-lime-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-lime-900/20 transition hover:bg-lime-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"><Plus className="h-3.5 w-3.5" /> Nouveau plan</button>}</div>
    {activePlans.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">Aucun apport programmé. Choisissez une campagne, une parcelle et les dates d’application pour préparer les tâches à venir.</p> : <div className="mt-4 grid gap-3 lg:grid-cols-2">{activePlans.map((plan) => { const article = articles.find((item) => item.id === plan.articleId); const quantity = plan.doseKgPerHectare * plan.parcelleArea; const cover = quantity > 0 ? (article?.quantity ?? 0) / quantity : 0; return <article key={plan.id} className="rounded-xl border border-lime-100 bg-lime-50/40 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">{plan.planName}</p><p className="mt-0.5 text-xs text-slate-600">{plan.campaignName || 'Campagne'} · {plan.parcelleName || 'Parcelle'}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-lime-700">Actif</span></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><span className="text-slate-500">Dose</span><p className="font-bold text-slate-900">{number(plan.doseKgPerHectare, 2)} kg/ha</p></div><div><span className="text-slate-500">Par apport</span><p className="font-bold text-slate-900">{number(quantity, 2)} kg</p></div><div><span className="text-slate-500">Couverture</span><p className={cover < plan.applicationDates.length ? 'font-bold text-amber-700' : 'font-bold text-slate-900'}>{number(cover, 1)} apports</p></div></div><p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-600"><CalendarDays className="h-3.5 w-3.5 text-lime-600" />{plan.applicationDates.join(' · ') || 'Dates à préciser'}</p>{role === 'admin' && <div className="mt-3 flex gap-2"><button type="button" onClick={() => edit(plan)} className="inline-flex items-center gap-1.5 rounded-full border border-lime-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-lime-700"><Save className="h-3 w-3" /> Modifier</button><button type="button" onClick={() => onDeactivate(plan.id)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600"><PauseCircle className="h-3 w-3" /> Arrêter</button></div>}</article>; })}</div>}
    {role === 'admin' && (campaigns.length === 0 || parcelles.length === 0 || activeArticles.length === 0) && <p className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-700"><PackageCheck className="h-3.5 w-3.5" />Créez une campagne, sa parcelle et un intrant en stock pour programmer les apports.</p>}
  </section>;
}
