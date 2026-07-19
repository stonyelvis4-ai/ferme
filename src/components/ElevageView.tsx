/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Plus,
  TrendingUp,
  HeartCrack,
  Calendar,
  Building2,
  Lock,
  MessageSquare,
  Package,
  Clock3,
  Scale,
  LineChart,
} from 'lucide-react';
import { AnimalFeeding, AnimalFeedPlan, AnimalWeighing, Building, EggSale, Lot, SanitaryTreatment, StockArticle, UserRole } from '../types';
import AdminEntityActions from './AdminEntityActions';
import FormDialog from './FormDialog';

interface ElevageViewProps {
  role: UserRole;
  lots: Lot[];
  buildings: Building[];
  articles: StockArticle[];
  feedings: AnimalFeeding[];
  feedPlans: AnimalFeedPlan[];
  weighings: AnimalWeighing[];
  eggSales: EggSale[];
  treatments: SanitaryTreatment[];
  currency: string;
  onAddLot: (newLot: Omit<Lot, 'id' | 'currentCount' | 'mortalityCount'>) => void;
  onCreateFeedPlan: (
    lotId: string,
    planName: string,
    rationPerHeadKg: number,
    feedingsPerDay: number,
    startDate: string,
    articleId?: string,
    notes?: string
  ) => void;
  onRecordFeeding: (lotId: string, articleId: string, quantity: number, feedingDate: string, feedingTime?: string, notes?: string) => void;
  onRecordWeighing: (lotId: string, averageWeightKg: number, weighingDate: string, sampleSize?: number, notes?: string) => void;
  onReportMortality: (lotId: string, count: number) => void;
  onUpdateLot: (lotId: string, updates: Partial<Lot>) => void;
  onDeleteLot: (lotId: string) => void;
}

export default function ElevageView({
  role,
  lots,
  buildings,
  articles,
  feedings,
  feedPlans,
  weighings,
  eggSales,
  treatments,
  currency,
  onAddLot,
  onCreateFeedPlan,
  onRecordFeeding,
  onRecordWeighing,
  onReportMortality,
  onUpdateLot,
  onDeleteLot,
}: ElevageViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFeedPlanForm, setShowFeedPlanForm] = useState(false);
  const [showFeedingForm, setShowFeedingForm] = useState(false);
  const [showWeighingForm, setShowWeighingForm] = useState(false);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('Volaille');
  const [breed, setBreed] = useState('Cobb 500');
  const [buildingId, setBuildingId] = useState(buildings[0]?.id || '');
  const [initialCount, setInitialCount] = useState(1000);
  const [unitCost, setUnitCost] = useState(0);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [mortalityLotId, setMortalityLotId] = useState<string | null>(null);
  const [mortalityCount, setMortalityCount] = useState(1);

  const [feedPlanLotId, setFeedPlanLotId] = useState('');
  const [feedPlanArticleId, setFeedPlanArticleId] = useState('');
  const [feedPlanName, setFeedPlanName] = useState('Plan standard');
  const [rationPerHeadKg, setRationPerHeadKg] = useState<number | ''>('');
  const [feedingsPerDay, setFeedingsPerDay] = useState<number | ''>(2);
  const [feedPlanStartDate, setFeedPlanStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [feedPlanNotes, setFeedPlanNotes] = useState('');

  const [feedingLotId, setFeedingLotId] = useState('');
  const [feedingArticleId, setFeedingArticleId] = useState('');
  const [feedingQuantity, setFeedingQuantity] = useState<number | ''>('');
  const [feedingDate, setFeedingDate] = useState(new Date().toISOString().split('T')[0]);
  const [feedingTime, setFeedingTime] = useState(new Date().toTimeString().slice(0, 5));
  const [feedingNotes, setFeedingNotes] = useState('');

  const [weighingLotId, setWeighingLotId] = useState('');
  const [weighingDate, setWeighingDate] = useState(new Date().toISOString().split('T')[0]);
  const [averageWeightKg, setAverageWeightKg] = useState<number | ''>('');
  const [sampleSize, setSampleSize] = useState<number | ''>('');
  const [weighingNotes, setWeighingNotes] = useState('');
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editLotName, setEditLotName] = useState('');
  const [editLotBreed, setEditLotBreed] = useState('');
  const [editLotNotes, setEditLotNotes] = useState('');

  const acquisitionCost = initialCount * unitCost;
  const availableBuildings = buildings;
  const activeLots = lots.filter((lot) => lot.status === 'active');
  const selectedBuilding = buildings.find((item) => item.id === buildingId);
  const feedArticles = articles.filter((article) => {
    const haystack = `${article.category} ${article.categoryLabel ?? ''} ${article.name}`.toLowerCase();
    return article.isActive !== false && (haystack.includes('aliment') || haystack.includes('provende') || haystack.includes('feed'));
  });
  const activeFeedPlans = feedPlans.filter((plan) => plan.isActive);

  const sortedFeedings = [...feedings].sort((left, right) => {
    const leftStamp = new Date(`${left.date}T${left.time || '00:00'}:00`).getTime();
    const rightStamp = new Date(`${right.date}T${right.time || '00:00'}:00`).getTime();
    return rightStamp - leftStamp;
  });
  const sortedWeighings = [...weighings].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

  const selectedPlanLot = lots.find((lot) => lot.id === feedPlanLotId);
  const selectedPlanArticle = feedArticles.find((article) => article.id === feedPlanArticleId);
  const selectedFeedingLot = lots.find((lot) => lot.id === feedingLotId);
  const selectedFeedArticle = feedArticles.find((article) => article.id === feedingArticleId);
  const selectedWeighingLot = lots.find((lot) => lot.id === weighingLotId);
  const previousLotWeighing = sortedWeighings.find((weighing) => weighing.lotId === weighingLotId);

  const totalFeedCost = sortedFeedings.reduce((sum, feeding) => sum + feeding.totalCost, 0);
  const todayFeedQuantity = sortedFeedings
    .filter((feeding) => feeding.date === feedingDate)
    .reduce((sum, feeding) => sum + feeding.quantity, 0);
  const recentFeedings = sortedFeedings.slice(0, 6);
  const recentWeighings = sortedWeighings.slice(0, 6);
  const latestWeighing = sortedWeighings[0];

  const projectedDailyPlanQuantity = (Number(rationPerHeadKg) || 0) * Math.max(selectedPlanLot?.currentCount ?? 0, 0);
  const projectedFeedingCost = (Number(feedingQuantity) || 0) * (selectedFeedArticle?.unitCost ?? 0);
  const projectedTotalWeight = (Number(averageWeightKg) || 0) * Math.max(Number(sampleSize) || selectedWeighingLot?.currentCount || 0, 0);

  const recentFeedWindow = new Date();
  recentFeedWindow.setDate(recentFeedWindow.getDate() - 6);

  const lotPerformanceRows = lots
    .filter((lot) => lot.status === 'active')
    .map((lot) => {
      const lotPlan = activeFeedPlans.find((plan) => plan.lotId === lot.id);
      const lotFeedings = sortedFeedings.filter(
        (feeding) => feeding.lotId === lot.id && new Date(feeding.date).getTime() >= recentFeedWindow.getTime()
      );
      const lotSales = eggSales.filter((sale) => sale.lotId === lot.id);
      const lotTreatments = treatments.filter((treatment) => treatment.lotId === lot.id && treatment.status === 'completed');
      const lotWeighings = sortedWeighings.filter((weighing) => weighing.lotId === lot.id);
      const currentWeighing = lotWeighings[0];
      const previousWeighingForLot = lotWeighings[1];
      const feedQuantity7d = lotFeedings.reduce((sum, feeding) => sum + feeding.quantity, 0);
      const feedCost7d = lotFeedings.reduce((sum, feeding) => sum + feeding.totalCost, 0);
      const sanitaryCostTotal = lotTreatments.reduce((sum, treatment) => sum + treatment.cost, 0);
      const acquisitionCostTotal = lot.acquisitionCost ?? lot.initialCount * (lot.unitCost ?? 0);
      const totalInvested = acquisitionCostTotal + sortedFeedings.filter((feeding) => feeding.lotId === lot.id).reduce((sum, feeding) => sum + feeding.totalCost, 0) + sanitaryCostTotal;
      const revenueTotal = lotSales.reduce((sum, sale) => sum + sale.amountPaid, 0);
      const grossMargin = revenueTotal - totalInvested;
      const plannedWeeklyQuantity = lotPlan ? lotPlan.targetDailyQuantityKg * 7 : 0;
      const planGapKg = plannedWeeklyQuantity > 0 ? feedQuantity7d - plannedWeeklyQuantity : 0;
      const rationPerHead = lot.currentCount > 0 ? feedQuantity7d / lot.currentCount : 0;
      const feedCostPerHead = lot.currentCount > 0 ? feedCost7d / lot.currentCount : 0;
      const totalCostPerHead = lot.currentCount > 0 ? totalInvested / lot.currentCount : totalInvested;
      const grossMarginPerHead = lot.currentCount > 0 ? grossMargin / lot.currentCount : grossMargin;
      const averageGainKg = currentWeighing?.weightGainKg ?? 0;
      const biomassGainKg =
        currentWeighing && averageGainKg > 0
          ? averageGainKg * Math.max(currentWeighing.sampleSize ?? lot.currentCount, 1)
          : 0;
      const feedConversionEstimate = biomassGainKg > 0 ? feedQuantity7d / biomassGainKg : null;
      const costPerKgLiveWeight =
        currentWeighing && currentWeighing.totalWeightKg > 0
          ? totalInvested / currentWeighing.totalWeightKg
          : null;

      const recommendation =
        currentWeighing && averageGainKg <= 0
          ? 'Controler ration, eau et ambiance.'
          : lotPlan && Math.abs(planGapKg) > Math.max(plannedWeeklyQuantity * 0.15, 1)
            ? 'Ecart important entre le plan et la pratique.'
            : rationPerHead === 0
              ? 'Aucune ration enregistree sur 7 jours.'
              : feedConversionEstimate !== null && feedConversionEstimate > 3.5
                ? 'Ration a optimiser, indice eleve.'
                : 'Suivi coherent pour le moment.';

      return {
        lot,
        lotPlan,
        currentWeighing,
        previousWeighingForLot,
        acquisitionCostTotal,
        feedQuantity7d,
        feedCost7d,
        sanitaryCostTotal,
        totalInvested,
        revenueTotal,
        grossMargin,
        plannedWeeklyQuantity,
        planGapKg,
        rationPerHead,
        feedCostPerHead,
        totalCostPerHead,
        grossMarginPerHead,
        averageGainKg,
        feedConversionEstimate,
        costPerKgLiveWeight,
        recommendation,
      };
    });

  useEffect(() => {
    if (availableBuildings.length === 0) {
      if (buildingId) setBuildingId('');
      return;
    }

    if (!buildingId || !availableBuildings.some((building) => building.id === buildingId)) {
      setBuildingId(availableBuildings[0].id);
    }
  }, [availableBuildings, buildingId]);

  useEffect(() => {
    if (activeLots.length === 0) {
      if (feedPlanLotId) setFeedPlanLotId('');
      if (feedingLotId) setFeedingLotId('');
      if (weighingLotId) setWeighingLotId('');
      return;
    }

    if (!feedPlanLotId || !activeLots.some((lot) => lot.id === feedPlanLotId)) {
      setFeedPlanLotId(activeLots[0].id);
    }

    if (!feedingLotId || !activeLots.some((lot) => lot.id === feedingLotId)) {
      setFeedingLotId(activeLots[0].id);
    }

    if (!weighingLotId || !activeLots.some((lot) => lot.id === weighingLotId)) {
      setWeighingLotId(activeLots[0].id);
    }
  }, [activeLots, feedPlanLotId, feedingLotId, weighingLotId]);

  useEffect(() => {
    if (feedArticles.length === 0) {
      if (feedPlanArticleId) setFeedPlanArticleId('');
      if (feedingArticleId) setFeedingArticleId('');
      return;
    }

    if (feedingArticleId && !feedArticles.some((article) => article.id === feedingArticleId)) {
      setFeedingArticleId(feedArticles[0].id);
    }

    if (showFeedingForm && !feedingArticleId) {
      setFeedingArticleId(feedArticles[0].id);
    }

    if (feedPlanArticleId && !feedArticles.some((article) => article.id === feedPlanArticleId)) {
      setFeedPlanArticleId('');
    }
  }, [feedArticles, feedPlanArticleId, feedingArticleId, showFeedingForm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !species || !breed || !buildingId || initialCount <= 0 || unitCost <= 0) return;

    onAddLot({
      name,
      species,
      breed,
      buildingId,
      initialCount,
      unitCost,
      acquisitionCost: initialCount * unitCost,
      entryDate,
      status: 'active',
      notes,
    });

    setName('');
    setUnitCost(0);
    setShowAddForm(false);
  };

  const handleFeedPlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedRation = Number(rationPerHeadKg);
    const normalizedFrequency = Number(feedingsPerDay);
    if (!feedPlanLotId || normalizedRation <= 0 || normalizedFrequency <= 0) return;

    onCreateFeedPlan(
      feedPlanLotId,
      feedPlanName,
      normalizedRation,
      normalizedFrequency,
      feedPlanStartDate,
      feedPlanArticleId || undefined,
      feedPlanNotes
    );

    setFeedPlanLotId('');
    setFeedPlanArticleId('');
    setFeedPlanName('Plan standard');
    setRationPerHeadKg('');
    setFeedingsPerDay(2);
    setFeedPlanNotes('');
    setShowFeedPlanForm(false);
  };

  const handleFeedingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedQuantity = Number(feedingQuantity);
    if (!feedingLotId || !feedingArticleId || normalizedQuantity <= 0) return;

    onRecordFeeding(
      feedingLotId,
      feedingArticleId,
      normalizedQuantity,
      feedingDate,
      feedingTime || undefined,
      feedingNotes
    );

    setFeedingLotId('');
    setFeedingArticleId('');
    setFeedingQuantity('');
    setFeedingNotes('');
    setShowFeedingForm(false);
  };

  const handleWeighingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedAverage = Number(averageWeightKg);
    const normalizedSample = Number(sampleSize);
    if (!weighingLotId || normalizedAverage <= 0) return;

    onRecordWeighing(
      weighingLotId,
      normalizedAverage,
      weighingDate,
      normalizedSample > 0 ? normalizedSample : undefined,
      weighingNotes
    );

    setWeighingLotId('');
    setAverageWeightKg('');
    setSampleSize('');
    setWeighingNotes('');
    setShowWeighingForm(false);
  };

  const handleMortalitySubmit = (lotId: string) => {
    if (mortalityCount <= 0) return;
    onReportMortality(lotId, mortalityCount);
    setMortalityLotId(null);
    setMortalityCount(1);
  };

  const handleEditLot = (lot: Lot) => {
    setEditingLotId(lot.id);
    setEditLotName(lot.name);
    setEditLotBreed(lot.breed);
    setEditLotNotes(lot.notes ?? '');
  };

  const handleSubmitLotEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLotId || !editLotName.trim()) return;

    onUpdateLot(editingLotId, {
      name: editLotName.trim(),
      breed: editLotBreed.trim(),
      notes: editLotNotes.trim(),
    });

    setEditingLotId(null);
    setEditLotName('');
    setEditLotBreed('');
    setEditLotNotes('');
  };

  return (
    <div id="elevage-view" className="space-y-6">
      <FormDialog
        open={editingLotId !== null}
        title="Modifier le lot"
        subtitle="Gardez un nom, une race et des observations coherents pour le suivi technique."
        confirmLabel="Enregistrer"
        confirmDisabled={!editLotName.trim()}
        onCancel={() => {
          setEditingLotId(null);
          setEditLotName('');
          setEditLotBreed('');
          setEditLotNotes('');
        }}
        onSubmit={handleSubmitLotEdit}
      >
        <div className="grid grid-cols-1 gap-4">
          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Nom du lot</span>
            <input
              autoFocus
              value={editLotName}
              onChange={(e) => setEditLotName(e.target.value)}
              placeholder="Ex. Lot poulets chair A"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Race</span>
            <input
              value={editLotBreed}
              onChange={(e) => setEditLotBreed(e.target.value)}
              placeholder="Ex. Cobb 500"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Observations</span>
            <textarea
              rows={4}
              value={editLotNotes}
              onChange={(e) => setEditLotNotes(e.target.value)}
              placeholder="Consignes, ambiance, particularites du lot..."
              className="w-full rounded-2xl border border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>
      </FormDialog>

      <div className="flex flex-col gap-3 xl:flex-row xl:justify-between xl:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Module Elevage & Cheptel
          </h2>
          <p className="text-xs text-slate-500">
            Suivi des lots d'animaux, de la croissance et de la sante de l'exploitation.
          </p>
        </div>
        {role === 'admin' ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFeedPlanForm(!showFeedPlanForm)}
              className="inline-flex items-center gap-2 rounded-full border border-lime-200 bg-lime-50 px-5 py-2.5 text-sm font-semibold text-lime-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-lime-100"
            >
              <Package className="w-4 h-4" />
              Plan d'alimentation
            </button>
            <button
              type="button"
              onClick={() => setShowWeighingForm(!showWeighingForm)}
              className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm font-semibold text-sky-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-100"
            >
              <LineChart className="w-4 h-4" />
              Enregistrer une pesee
            </button>
            <button
              type="button"
              onClick={() => setShowFeedingForm(!showFeedingForm)}
              className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-100"
            >
              <Package className="w-4 h-4" />
              Nourrir un lot
            </button>
            <button
              id="btn-add-lot"
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              Nouveau lot d'animaux
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            <Lock className="w-3 h-3" /> Lecture seule (proprietaire)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Lots actifs</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{lots.filter((lot) => lot.status === 'active').length}</div>
          <p className="mt-1 text-xs text-slate-500">Cheptel actuellement exploite.</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Rations du jour</div>
          <div className="mt-2 text-2xl font-bold text-amber-900">{todayFeedQuantity.toLocaleString('fr-FR')}</div>
          <p className="mt-1 text-xs text-amber-800">Quantite distribuee aujourd'hui.</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">Cout alimentation</div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">{totalFeedCost.toLocaleString('fr-FR')} {currency}</div>
          <p className="mt-1 text-xs text-emerald-800">Historique total enregistre.</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Dernier poids moyen</div>
          <div className="mt-2 text-2xl font-bold text-sky-900">{latestWeighing ? latestWeighing.averageWeightKg.toFixed(3) : '0.000'} kg</div>
          <p className="mt-1 text-xs text-sky-800">{latestWeighing ? `Gain recent : ${latestWeighing.weightGainKg.toFixed(3)} kg` : 'Aucune pesee enregistree.'}</p>
        </div>
      </div>

      {showAddForm && role === 'admin' && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2">
            Creer un nouveau lot d'animaux
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Projection lot</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{name || 'Nom en attente'}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Espece: {species} | Race: {breed}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Affectation</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{selectedBuilding?.name || 'Batiment a choisir'}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Capacite: {selectedBuilding?.capacity ?? 0} sujets</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Valeur initiale</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{acquisitionCost.toLocaleString('fr-FR')} {currency}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Effectif initial x prix unitaire.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nom du lot *</label>
              <input id="lot-name-input" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Lot poulets chair A" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <p className="mt-1 text-[10px] text-slate-500">Nom unique pour retrouver le lot.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Espece *</label>
              <select id="lot-species-input" value={species} onChange={(e) => setSpecies(e.target.value)} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100">
                <option value="Volaille (Chair)">Volaille (Chair)</option>
                <option value="Volaille (Pondeuses)">Volaille (Pondeuses)</option>
                <option value="Porcin">Porcin</option>
                <option value="Bovin">Bovin</option>
                <option value="Ovin/Caprin">Ovin/Caprin</option>
              </select>
              <p className="mt-1 text-[10px] text-slate-500">Type d'animaux suivis.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Race *</label>
              <input id="lot-breed-input" type="text" required value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Ex. Cobb 500" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <p className="mt-1 text-[10px] text-slate-500">Race, souche ou variete animale.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Batiment *</label>
              <select id="lot-building-input" value={buildingId} onChange={(e) => setBuildingId(e.target.value)} disabled={availableBuildings.length === 0} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100">
                {availableBuildings.length === 0 ? (
                  <option value="">Aucun batiment disponible</option>
                ) : (
                  availableBuildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (capacite {b.capacity})
                    </option>
                  ))
                )}
              </select>
              <p className="mt-1 text-[10px] text-slate-500">{availableBuildings.length === 0 ? "Créez d'abord un bâtiment pour rattacher correctement le lot." : "Lieu d'hebergement du lot."}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Effectif initial *</label>
              <input id="lot-count-input" type="number" required min={1} value={initialCount} onChange={(e) => setInitialCount(Number(e.target.value))} placeholder="Ex. 1000" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <p className="mt-1 text-[10px] text-slate-500">Nombre d'animaux a l'entree.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date d'entree *</label>
              <input id="lot-date-input" type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <p className="mt-1 text-[10px] text-slate-500">Date d'arrivee dans la ferme.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Prix unitaire ({currency}) *</label>
              <input id="lot-unit-cost-input" type="number" required min={0.01} step="0.01" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} placeholder={`Ex. 850 ${currency}`} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <p className="mt-1 text-[10px] text-slate-400">Cout total : {(initialCount * unitCost).toLocaleString('fr-FR')} {currency}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <textarea id="lot-notes-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. Lot vaccine a l'arrivee, fournisseur X" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            <p className="mt-1 text-[10px] text-slate-500">Observation utile pour le suivi sanitaire ou financier.</p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowAddForm(false)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700">
              Annuler
            </button>
            <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700">
              Enregistrer le lot
            </button>
          </div>
        </form>
      )}

      {showFeedPlanForm && role === 'admin' && (
        <form onSubmit={handleFeedPlanSubmit} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-50 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Creer un plan d'alimentation</h3>
              <p className="mt-1 text-xs text-slate-500">Definissez une ration cible par tete pour comparer automatiquement le prevu au reel.</p>
            </div>
            <div className="rounded-2xl border border-lime-100 bg-lime-50 px-4 py-3 text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime-700">Prevision journaliere</div>
              <div className="mt-1 text-lg font-bold text-lime-900">{projectedDailyPlanQuantity.toLocaleString('fr-FR', { maximumFractionDigits: 3 })} kg</div>
              <p className="mt-1 text-[11px] text-lime-800">Calculee sur l'effectif actuel du lot.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Lot concerne *</label>
              <select value={feedPlanLotId} onChange={(e) => setFeedPlanLotId(e.target.value)} disabled={activeLots.length === 0} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100 disabled:cursor-not-allowed disabled:bg-slate-100" required>
                <option value="">{activeLots.length === 0 ? 'Aucun lot actif disponible' : 'Selectionner un lot'}</option>
                {activeLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name} ({lot.currentCount} tetes)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nom du plan *</label>
              <input type="text" value={feedPlanName} onChange={(e) => setFeedPlanName(e.target.value)} placeholder="Ex. Demarrage chair S3" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Aliment principal</label>
              <select value={feedPlanArticleId} onChange={(e) => setFeedPlanArticleId(e.target.value)} disabled={feedArticles.length === 0} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100 disabled:cursor-not-allowed disabled:bg-slate-100">
                <option value="">Sans article impose</option>
                {feedArticles.map((article) => (
                  <option key={article.id} value={article.id}>
                    {article.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-500">{feedArticles.length === 0 ? "Aucun intrant d'alimentation actif n'est encore disponible dans le stock." : "Article de stock recommandé pour ce plan."}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ration / tete / jour (kg) *</label>
              <input type="number" min={0.001} step="0.001" value={rationPerHeadKg} onChange={(e) => setRationPerHeadKg(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex. 0.115" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre de distributions / jour *</label>
              <input type="number" min={1} max={12} step="1" value={feedingsPerDay} onChange={(e) => setFeedingsPerDay(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date de debut *</label>
              <input type="date" value={feedPlanStartDate} onChange={(e) => setFeedPlanStartDate(e.target.value)} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100" required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <textarea rows={2} value={feedPlanNotes} onChange={(e) => setFeedPlanNotes(e.target.value)} placeholder="Ex. formule croissance, repartition matin/soir, transition sur 3 jours..." className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100" />
            <p className="mt-1 text-[10px] text-slate-500">
              {selectedPlanLot ? `${selectedPlanLot.name}` : 'Lot a choisir'}
              {selectedPlanArticle ? ` | Aliment : ${selectedPlanArticle.name}` : ' | Aliment libre'}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowFeedPlanForm(false)} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-lime-700 bg-lime-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-lime-900/20 transition hover:-translate-y-0.5 hover:bg-lime-700">
              Enregistrer le plan
            </button>
          </div>
        </form>
      )}

      {showFeedingForm && role === 'admin' && (
        <form onSubmit={handleFeedingSubmit} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-50 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Enregistrer une distribution d'aliment</h3>
              <p className="mt-1 text-xs text-slate-500">Chaque ration alimente automatiquement le stock, la comptabilite et la tracabilite du lot.</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Cout previsionnel</div>
              <div className="mt-1 text-lg font-bold text-amber-900">{projectedFeedingCost.toLocaleString('fr-FR')} {currency}</div>
              <p className="mt-1 text-[11px] text-amber-800">Calcule depuis le prix unitaire de l'article.</p>
            </div>
          </div>

          {feedArticles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Aucun article d'alimentation actif n'est disponible dans le stock. Ajoutez un intrant de categorie Aliment pour commencer.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lot concerne *</label>
                  <select value={feedingLotId} onChange={(e) => setFeedingLotId(e.target.value)} disabled={activeLots.length === 0} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100" required>
                    <option value="">{activeLots.length === 0 ? 'Aucun lot actif disponible' : 'Selectionner un lot'}</option>
                    {activeLots.map((lot) => (
                      <option key={lot.id} value={lot.id}>
                        {lot.name} ({lot.currentCount} tetes)
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500">Lot animal qui consomme la ration.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Article de stock *</label>
                  <select value={feedingArticleId} onChange={(e) => setFeedingArticleId(e.target.value)} disabled={feedArticles.length === 0} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100" required>
                    <option value="">{feedArticles.length === 0 ? 'Aucun aliment disponible' : 'Selectionner un aliment'}</option>
                    {feedArticles.map((article) => (
                      <option key={article.id} value={article.id}>
                        {article.name} ({article.quantity} {article.unit} disponibles)
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500">Intrant retire automatiquement du magasin.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quantite distribuee *</label>
                  <input type="number" min={0.01} step="0.01" value={feedingQuantity} onChange={(e) => setFeedingQuantity(e.target.value === '' ? '' : Number(e.target.value))} placeholder={`Ex. 25 ${selectedFeedArticle?.unit ?? 'kg'}`} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100" required />
                  <p className="mt-1 text-[10px] text-slate-500">Renseignez la ration reelle consommee.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
                  <input type="date" value={feedingDate} onChange={(e) => setFeedingDate(e.target.value)} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100" required />
                  <p className="mt-1 text-[10px] text-slate-500">Jour effectif de la distribution.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Heure</label>
                  <input type="time" value={feedingTime} onChange={(e) => setFeedingTime(e.target.value)} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100" />
                  <p className="mt-1 text-[10px] text-slate-500">Utile pour les distributions multiples par jour.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Repere rapide</label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    {selectedFeedingLot ? `${selectedFeedingLot.name} | ` : 'Lot a choisir | '}
                    {selectedFeedArticle ? `${selectedFeedArticle.name}` : 'Article a choisir'}
                    <br />
                    {selectedFeedArticle ? `Stock dispo : ${selectedFeedArticle.quantity} ${selectedFeedArticle.unit}` : 'Le stock disponible s affichera ici.'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <textarea rows={2} value={feedingNotes} onChange={(e) => setFeedingNotes(e.target.value)} placeholder="Ex. ration du matin, complement vitamine, changement de formule..." className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100" />
                <p className="mt-1 text-[10px] text-slate-500">Observation utile pour les performances et le suivi financier.</p>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowFeedingForm(false)} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
                  Annuler
                </button>
                <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-amber-700 bg-amber-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:bg-amber-600">
                  Enregistrer la ration
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {showWeighingForm && role === 'admin' && (
        <form onSubmit={handleWeighingSubmit} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-50 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Enregistrer une pesee de lot</h3>
              <p className="mt-1 text-xs text-slate-500">Les pesees servent au suivi de croissance, a la detection des ecarts et au pilotage de l'alimentation.</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">Projection biomasse</div>
              <div className="mt-1 text-lg font-bold text-sky-900">{projectedTotalWeight.toLocaleString('fr-FR', { maximumFractionDigits: 3 })} kg</div>
              <p className="mt-1 text-[11px] text-sky-800">Poids moyen multiplie par l'effectif ou l'echantillon.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Lot concerne *</label>
              <select value={weighingLotId} onChange={(e) => setWeighingLotId(e.target.value)} disabled={activeLots.length === 0} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100" required>
                <option value="">{activeLots.length === 0 ? 'Aucun lot actif disponible' : 'Selectionner un lot'}</option>
                {activeLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name} ({lot.currentCount} tetes)
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-500">Lot animal suivi par la pesee.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
              <input type="date" value={weighingDate} onChange={(e) => setWeighingDate(e.target.value)} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100" required />
              <p className="mt-1 text-[10px] text-slate-500">Jour effectif de la mesure.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Poids moyen (kg) *</label>
              <input type="number" min={0.001} step="0.001" value={averageWeightKg} onChange={(e) => setAverageWeightKg(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex. 1.850" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100" required />
              <p className="mt-1 text-[10px] text-slate-500">Poids moyen observe sur les animaux peses.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Taille d'echantillon</label>
              <input type="number" min={1} step="1" value={sampleSize} onChange={(e) => setSampleSize(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex. 50" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100" />
              <p className="mt-1 text-[10px] text-slate-500">Laisser vide pour utiliser l'effectif actuel du lot.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Repere croissance</label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                {selectedWeighingLot ? `${selectedWeighingLot.name} | ` : 'Lot a choisir | '}
                {previousLotWeighing ? `Dernier poids : ${previousLotWeighing.averageWeightKg.toFixed(3)} kg` : 'Premiere pesee du lot'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <textarea rows={2} value={weighingNotes} onChange={(e) => setWeighingNotes(e.target.value)} placeholder="Ex. pesee hebdomadaire, lot calme, correction ration demarree..." className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100" />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowWeighingForm(false)} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-sky-700 bg-sky-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-900/20 transition hover:-translate-y-0.5 hover:bg-sky-700">
              Enregistrer la pesee
            </button>
          </div>
        </form>
      )}

      {lots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Aucun lot d'elevage enregistre pour cette ferme.</p>
          <p className="mt-2 text-xs text-slate-500">
            Les lots crees depuis le module elevage apparaitront ici avec leur effectif, leur batiment et leur suivi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lots.map((lot) => {
            const building = buildings.find((b) => b.id === lot.buildingId);
            const survivalRate = lot.initialCount > 0 ? ((lot.currentCount / lot.initialCount) * 100).toFixed(1) : '0';

            return (
              <div
                key={lot.id}
                className={`bg-white rounded-2xl border ${
                  lot.status === 'active' ? 'border-slate-100' : 'border-slate-200 bg-slate-50/50'
                } p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 font-sans tracking-tight text-sm">{lot.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wide">
                      {lot.species} - {lot.breed}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                      lot.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {lot.status === 'active' ? 'Actif' : 'Archive'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Initial</span>
                    <span className="text-xs font-bold text-slate-700">{lot.initialCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Actuels</span>
                    <span className="text-xs font-bold text-emerald-600">{lot.currentCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Morts</span>
                    <span className={`text-xs font-bold ${lot.mortalityCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {lot.mortalityCount}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> Localisation :
                    </span>
                    <span className="font-semibold text-slate-700">{building?.name || 'Inconnu'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Date d'entree :
                    </span>
                    <span className="font-semibold text-slate-700">{lot.entryDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Taux de survie :
                    </span>
                    <span className="font-bold text-emerald-600">{survivalRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Prix unitaire :</span>
                    <span className="font-semibold text-slate-700">{(lot.unitCost ?? 0).toLocaleString('fr-FR')} {currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Valeur d'acquisition :</span>
                    <span className="font-bold text-slate-800">{(lot.acquisitionCost ?? lot.initialCount * (lot.unitCost ?? 0)).toLocaleString('fr-FR')} {currency}</span>
                  </div>
                  {lot.notes && (
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-[11px] text-slate-500 flex gap-1.5 items-start mt-2 shadow-sm">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="italic">{lot.notes}</p>
                    </div>
                  )}
                </div>

                {role === 'admin' && lot.status === 'active' && (
                  <div className="pt-3 border-t border-slate-50 space-y-2">
                    {mortalityLotId === lot.id ? (
                      <div className="flex items-center gap-2 w-full animate-fade-in">
                        <input type="number" min={1} max={lot.currentCount} placeholder="Nbr" value={mortalityCount} onChange={(e) => setMortalityCount(Number(e.target.value))} className="w-16 border border-slate-200 rounded p-1 text-xs focus:outline-none focus:border-emerald-500" />
                        <button type="button" onClick={() => handleMortalitySubmit(lot.id)} className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3.5 py-2 text-[10px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-700">
                          Valider
                        </button>
                        <button type="button" onClick={() => setMortalityLotId(null)} className="text-[10px] font-semibold text-slate-500 hover:text-slate-700">
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMortalityLotId(lot.id);
                              setMortalityCount(1);
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3.5 py-2 text-[10px] font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100"
                          >
                            <HeartCrack className="w-3.5 h-3.5" /> Signaler une perte
                          </button>
                        </div>
                        <AdminEntityActions
                          compact
                          onEdit={() => handleEditLot(lot)}
                          onDelete={() => {
                            if (window.confirm(`Supprimer le lot ${lot.name} ?`)) {
                              onDeleteLot(lot.id);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lotPerformanceRows.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pilotage alimentation & croissance</h3>
              <p className="mt-1 text-xs text-slate-500">Lecture rapide par lot sur les 7 derniers jours et la derniere pesee disponible.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
              {lotPerformanceRows.length} lot{lotPerformanceRows.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
            {lotPerformanceRows.map((row) => (
              <div key={row.lot.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{row.lot.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.lot.species} - {row.lot.breed}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                    row.averageGainKg < 0 ? 'bg-rose-100 text-rose-700' : row.feedQuantity7d === 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {row.averageGainKg < 0 ? 'Croissance en baisse' : row.feedQuantity7d === 0 ? 'A completer' : 'Suivi actif'}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Ration / tete</div>
                    <div className="mt-1 font-bold text-slate-800">{row.rationPerHead.toFixed(3)} kg</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Cout / tete</div>
                    <div className="mt-1 font-bold text-slate-800">{row.feedCostPerHead.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currency}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Dernier poids</div>
                    <div className="mt-1 font-bold text-slate-800">{row.currentWeighing ? `${row.currentWeighing.averageWeightKg.toFixed(3)} kg` : '-'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Gain moyen</div>
                    <div className={`mt-1 font-bold ${row.averageGainKg < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {row.currentWeighing ? `${row.averageGainKg >= 0 ? '+' : ''}${row.averageGainKg.toFixed(3)} kg` : '-'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-2 text-xs text-slate-600">
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Aliment 7 jours</div>
                    <div className="mt-1 font-bold text-slate-800">{row.feedQuantity7d.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Cout 7 jours</div>
                    <div className="mt-1 font-bold text-slate-800">{row.feedCost7d.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currency}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">IC estime</div>
                    <div className="mt-1 font-bold text-slate-800">{row.feedConversionEstimate !== null ? row.feedConversionEstimate.toFixed(2) : '-'}</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-2 text-xs text-slate-600">
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Plan actif</div>
                    <div className="mt-1 font-bold text-slate-800">{row.lotPlan?.planName ?? 'Aucun plan'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Prevu 7 jours</div>
                    <div className="mt-1 font-bold text-slate-800">{row.lotPlan ? `${row.plannedWeeklyQuantity.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg` : '-'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Ecart plan / reel</div>
                    <div className={`mt-1 font-bold ${row.planGapKg < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {row.lotPlan ? `${row.planGapKg >= 0 ? '+' : ''}${row.planGapKg.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg` : '-'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 lg:grid-cols-4 gap-2 text-xs text-slate-600">
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Achat initial</div>
                    <div className="mt-1 font-bold text-slate-800">{row.acquisitionCostTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currency}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Sanitaire cumulé</div>
                    <div className="mt-1 font-bold text-slate-800">{row.sanitaryCostTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currency}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Coût total / tête</div>
                    <div className="mt-1 font-bold text-slate-800">{row.totalCostPerHead.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currency}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Coût / kg vif</div>
                    <div className="mt-1 font-bold text-slate-800">
                      {row.costPerKgLiveWeight !== null ? `${row.costPerKgLiveWeight.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${currency}` : '-'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs text-slate-600">
                  Investissement cumulé du lot : <span className="font-bold text-slate-800">{row.totalInvested.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currency}</span>
                </div>

                <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-2 text-xs text-slate-600">
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Revenus cumulés</div>
                    <div className="mt-1 font-bold text-slate-800">{row.revenueTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currency}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Marge brute</div>
                    <div className={`mt-1 font-bold ${row.grossMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {row.grossMargin.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currency}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Marge / tête</div>
                    <div className={`mt-1 font-bold ${row.grossMarginPerHead >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {row.grossMarginPerHead.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currency}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs text-slate-600">
                  {row.recommendation}
                  {row.previousWeighingForLot ? ` Derniere comparaison : ${row.previousWeighingForLot.averageWeightKg.toFixed(3)} kg avant la pesee actuelle.` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Historique alimentation</h3>
              <p className="mt-1 text-xs text-slate-500">Dernieres distributions enregistrees pour les animaux.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
              {sortedFeedings.length} operation{sortedFeedings.length > 1 ? 's' : ''}
            </span>
          </div>

          {recentFeedings.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Aucune distribution d'aliment n'a encore ete enregistree.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {recentFeedings.map((feeding) => (
                <div key={feeding.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{feeding.articleName}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Lot : {feeding.lotName || lots.find((lot) => lot.id === feeding.lotId)?.name || 'Non renseigne'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-amber-700">{feeding.quantity.toLocaleString('fr-FR')} {feeding.unit}</div>
                      <div className="mt-1 text-xs text-slate-500">{feeding.totalCost.toLocaleString('fr-FR')} {currency}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 border border-slate-100">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {feeding.date}
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 border border-slate-100">
                      <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                      {feeding.time || 'Heure non precisee'}
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 border border-slate-100">
                      <Scale className="w-3.5 h-3.5 text-slate-400" />
                      {feeding.unitCost.toLocaleString('fr-FR')} {currency}/{feeding.unit}
                    </div>
                  </div>
                  {feeding.notes && (
                    <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs text-slate-600">
                      {feeding.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Stock d'aliments suivi</h3>
          <p className="mt-1 text-xs text-slate-500">Vue rapide des articles les plus utiles au module elevage.</p>

          {feedArticles.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Aucun aliment actif disponible dans le module stock.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {feedArticles.slice(0, 8).map((article) => {
                const isLow = article.quantity <= article.minThreshold;
                return (
                  <div key={article.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{article.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{article.categoryLabel || article.category}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isLow ? 'A reapprovisionner' : 'Disponible'}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                        <div className="text-slate-400">Stock</div>
                        <div className="mt-1 font-bold text-slate-800">{article.quantity.toLocaleString('fr-FR')} {article.unit}</div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                        <div className="text-slate-400">Prix unitaire</div>
                        <div className="mt-1 font-bold text-slate-800">{(article.unitCost ?? 0).toLocaleString('fr-FR')} {currency}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Plans d'alimentation actifs</h3>
            <p className="mt-1 text-xs text-slate-500">Referentiel des rations cibles actuellement appliquees dans les lots.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            {activeFeedPlans.length} plan{activeFeedPlans.length > 1 ? 's' : ''}
          </span>
        </div>

        {activeFeedPlans.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Aucun plan d'alimentation actif n'a encore ete enregistre.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeFeedPlans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{plan.planName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {plan.lotName || lots.find((lot) => lot.id === plan.lotId)?.name || 'Lot'}
                      {plan.articleName ? ` | ${plan.articleName}` : ''}
                    </div>
                  </div>
                  <span className="rounded-full bg-lime-100 px-2.5 py-1 text-[10px] font-semibold uppercase text-lime-700">
                    Actif
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Ration / tete</div>
                    <div className="mt-1 font-bold text-slate-800">{plan.rationPerHeadKg.toFixed(3)} kg</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Distrib. / jour</div>
                    <div className="mt-1 font-bold text-slate-800">{plan.feedingsPerDay}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Cible / jour</div>
                    <div className="mt-1 font-bold text-slate-800">{plan.targetDailyQuantityKg.toFixed(3)} kg</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Debut</div>
                    <div className="mt-1 font-bold text-slate-800">{plan.startDate}</div>
                  </div>
                </div>

                {plan.notes && (
                  <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs text-slate-600">
                    {plan.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Historique de croissance</h3>
            <p className="mt-1 text-xs text-slate-500">Dernieres pesees enregistrees pour controler la progression des lots.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            {sortedWeighings.length} pesee{sortedWeighings.length > 1 ? 's' : ''}
          </span>
        </div>

        {recentWeighings.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Aucune pesee n'a encore ete enregistree.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recentWeighings.map((weighing) => (
              <div key={weighing.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{weighing.lotName || lots.find((lot) => lot.id === weighing.lotId)?.name || 'Lot'}</div>
                    <div className="mt-1 text-xs text-slate-500">{weighing.date}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${weighing.weightGainKg < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {weighing.weightGainKg >= 0 ? `+${weighing.weightGainKg.toFixed(3)} kg` : `${weighing.weightGainKg.toFixed(3)} kg`}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Poids moyen</div>
                    <div className="mt-1 font-bold text-slate-800">{weighing.averageWeightKg.toFixed(3)} kg</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Biomasse</div>
                    <div className="mt-1 font-bold text-slate-800">{weighing.totalWeightKg.toFixed(3)} kg</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-slate-400">Echantillon</div>
                    <div className="mt-1 font-bold text-slate-800">{weighing.sampleSize ?? '-'}</div>
                  </div>
                </div>
                {weighing.notes && (
                  <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs text-slate-600">
                    {weighing.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
