/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import { AnimalFeeding, Building, Lot, StockArticle, UserRole } from '../types';
import AdminEntityActions from './AdminEntityActions';

interface ElevageViewProps {
  role: UserRole;
  lots: Lot[];
  buildings: Building[];
  articles: StockArticle[];
  feedings: AnimalFeeding[];
  currency: string;
  onAddLot: (newLot: Omit<Lot, 'id' | 'currentCount' | 'mortalityCount'>) => void;
  onRecordFeeding: (lotId: string, articleId: string, quantity: number, feedingDate: string, feedingTime?: string, notes?: string) => void;
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
  currency,
  onAddLot,
  onRecordFeeding,
  onReportMortality,
  onUpdateLot,
  onDeleteLot,
}: ElevageViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFeedingForm, setShowFeedingForm] = useState(false);
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
  const [feedingLotId, setFeedingLotId] = useState('');
  const [feedingArticleId, setFeedingArticleId] = useState('');
  const [feedingQuantity, setFeedingQuantity] = useState<number | ''>('');
  const [feedingDate, setFeedingDate] = useState(new Date().toISOString().split('T')[0]);
  const [feedingTime, setFeedingTime] = useState(new Date().toTimeString().slice(0, 5));
  const [feedingNotes, setFeedingNotes] = useState('');

  const acquisitionCost = initialCount * unitCost;
  const selectedBuilding = buildings.find((item) => item.id === buildingId);
  const sortedFeedings = [...feedings].sort((left, right) => {
    const leftStamp = new Date(`${left.date}T${left.time || '00:00'}:00`).getTime();
    const rightStamp = new Date(`${right.date}T${right.time || '00:00'}:00`).getTime();
    return rightStamp - leftStamp;
  });
  const feedArticles = articles.filter((article) => {
    const haystack = `${article.category} ${article.categoryLabel ?? ''} ${article.name}`.toLowerCase();
    return article.isActive !== false && (haystack.includes('aliment') || haystack.includes('provende') || haystack.includes('feed'));
  });
  const selectedFeedArticle = feedArticles.find((article) => article.id === feedingArticleId);
  const selectedFeedingLot = lots.find((lot) => lot.id === feedingLotId);
  const totalFeedCost = sortedFeedings.reduce((sum, feeding) => sum + feeding.totalCost, 0);
  const todayFeedQuantity = sortedFeedings
    .filter((feeding) => feeding.date === feedingDate)
    .reduce((sum, feeding) => sum + feeding.quantity, 0);
  const recentFeedings = sortedFeedings.slice(0, 6);
  const projectedFeedingCost = (Number(feedingQuantity) || 0) * (selectedFeedArticle?.unitCost ?? 0);

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

  const handleMortalitySubmit = (lotId: string) => {
    if (mortalityCount <= 0) return;
    onReportMortality(lotId, mortalityCount);
    setMortalityLotId(null);
    setMortalityCount(1);
  };

  const handleEditLot = (lot: Lot) => {
    const nextName = window.prompt('Nom du lot', lot.name);
    if (!nextName) return;
    const nextBreed = window.prompt('Race du lot', lot.breed) ?? lot.breed;
    const nextNotes = window.prompt('Notes / observations', lot.notes ?? '') ?? lot.notes;
    onUpdateLot(lot.id, { name: nextName, breed: nextBreed, notes: nextNotes });
  };

  return (
    <div id="elevage-view" className="space-y-6">
      <div className="flex justify-between items-center">
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
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Intrants disponibles</div>
          <div className="mt-2 text-2xl font-bold text-sky-900">{feedArticles.length}</div>
          <p className="mt-1 text-xs text-sky-800">Articles utilisables pour nourrir.</p>
        </div>
      </div>

      {showAddForm && role === 'admin' && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in"
        >
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
              <input
                id="lot-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Lot poulets chair A"
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-1 text-[10px] text-slate-500">Nom unique pour retrouver le lot.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Espece *</label>
              <select
                id="lot-species-input"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
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
              <input
                id="lot-breed-input"
                type="text"
                required
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="Ex. Cobb 500"
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-1 text-[10px] text-slate-500">Race, souche ou variete animale.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Batiment *</label>
              <select
                id="lot-building-input"
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (capacite {b.capacity})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-500">Lieu d'hebergement du lot.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Effectif initial *</label>
              <input
                id="lot-count-input"
                type="number"
                required
                min={1}
                value={initialCount}
                onChange={(e) => setInitialCount(Number(e.target.value))}
                placeholder="Ex. 1000"
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-1 text-[10px] text-slate-500">Nombre d'animaux a l'entree.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date d'entree *</label>
              <input
                id="lot-date-input"
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-1 text-[10px] text-slate-500">Date d'arrivee dans la ferme.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Prix unitaire ({currency}) *</label>
              <input
                id="lot-unit-cost-input"
                type="number"
                required
                min={0.01}
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                placeholder={`Ex. 850 ${currency}`}
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Cout total : {(initialCount * unitCost).toLocaleString('fr-FR')} {currency}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <textarea
              id="lot-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex. Lot vaccine a l'arrivee, fournisseur X"
              className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <p className="mt-1 text-[10px] text-slate-500">Observation utile pour le suivi sanitaire ou financier.</p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
            >
              Enregistrer le lot
            </button>
          </div>
        </form>
      )}

      {showFeedingForm && role === 'admin' && (
        <form
          onSubmit={handleFeedingSubmit}
          className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in"
        >
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
                  <select
                    value={feedingLotId}
                    onChange={(e) => setFeedingLotId(e.target.value)}
                    className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
                    required
                  >
                    <option value="">Selectionner un lot</option>
                    {lots.filter((lot) => lot.status === 'active').map((lot) => (
                      <option key={lot.id} value={lot.id}>
                        {lot.name} ({lot.currentCount} tetes)
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500">Lot animal qui consomme la ration.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Article de stock *</label>
                  <select
                    value={feedingArticleId}
                    onChange={(e) => setFeedingArticleId(e.target.value)}
                    className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
                    required
                  >
                    <option value="">Selectionner un aliment</option>
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
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={feedingQuantity}
                    onChange={(e) => setFeedingQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={`Ex. 25 ${selectedFeedArticle?.unit ?? 'kg'}`}
                    className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
                    required
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Renseignez la ration reelle consommee.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
                  <input
                    type="date"
                    value={feedingDate}
                    onChange={(e) => setFeedingDate(e.target.value)}
                    className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
                    required
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Jour effectif de la distribution.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Heure</label>
                  <input
                    type="time"
                    value={feedingTime}
                    onChange={(e) => setFeedingTime(e.target.value)}
                    className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
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
                <textarea
                  rows={2}
                  value={feedingNotes}
                  onChange={(e) => setFeedingNotes(e.target.value)}
                  placeholder="Ex. ration du matin, complement vitaminé, changement de formule..."
                  className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
                <p className="mt-1 text-[10px] text-slate-500">Observation utile pour les performances et le suivi financier.</p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeedingForm(false)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full border border-amber-700 bg-amber-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:bg-amber-600"
                >
                  Enregistrer la ration
                </button>
              </div>
            </>
          )}
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
                        <input
                          type="number"
                          min={1}
                          max={lot.currentCount}
                          placeholder="Nbr"
                          value={mortalityCount}
                          onChange={(e) => setMortalityCount(Number(e.target.value))}
                          className="w-16 border border-slate-200 rounded p-1 text-xs focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleMortalitySubmit(lot.id)}
                          className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3.5 py-2 text-[10px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-700"
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          onClick={() => setMortalityLotId(null)}
                          className="text-[10px] font-semibold text-slate-500 hover:text-slate-700"
                        >
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
    </div>
  );
}
