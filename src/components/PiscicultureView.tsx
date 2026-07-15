/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Fish,
  Droplet,
  Plus,
  Thermometer,
  Activity,
  Lock,
  Zap
} from 'lucide-react';
import { FishBassin, StockArticle, UserRole } from '../types';
import AdminEntityActions from './AdminEntityActions';

interface PiscicultureViewProps {
  role: UserRole;
  bassins: FishBassin[];
  articles: StockArticle[];
  currency: string;
  onFeedFish: (bassinId: string, articleId: string, quantity: number) => void;
  onHarvestFish: (bassinId: string, fishCount: number, revenueAmount: number) => void;
  onAddBassin: (data: Omit<FishBassin, 'id' | 'currentCount' | 'mortalityCount'>) => void;
  onUpdateBassin: (bassinId: string, updates: Partial<FishBassin>) => void;
  onDeleteBassin: (bassinId: string) => void;
}

export default function PiscicultureView({
  role,
  bassins,
  articles,
  currency,
  onFeedFish,
  onHarvestFish,
  onAddBassin,
  onUpdateBassin,
  onDeleteBassin
}: PiscicultureViewProps) {
  const [selectedBassinId, setSelectedBassinId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [feedArticleId, setFeedArticleId] = useState('');
  const [feedQuantity, setFeedQuantity] = useState(25); // kg
  const [newName, setNewName] = useState('');
  const [newSpecies, setNewSpecies] = useState('Tilapia');
  const [newInitialCount, setNewInitialCount] = useState(1000);
  const [newStockingDate, setNewStockingDate] = useState(new Date().toISOString().split('T')[0]);

  const [harvestBassinId, setHarvestBassinId] = useState<string | null>(null);
  const [harvestCount, setHarvestCount] = useState(1000);
  const [harvestRevenue, setHarvestRevenue] = useState(500000);

  // Filter food articles in stock
  const foodArticles = articles.filter((a) => a.category === 'feed' && a.name.toLowerCase().includes('poisson'));

  const handleFeedSubmit = (bassinId: string) => {
    if (!feedArticleId || feedQuantity <= 0) return;
    onFeedFish(bassinId, feedArticleId, feedQuantity);
    setSelectedBassinId(null);
  };

  const handleHarvestSubmit = (bassinId: string) => {
    if (harvestCount <= 0 || harvestRevenue <= 0) return;
    onHarvestFish(bassinId, harvestCount, harvestRevenue);
    setHarvestBassinId(null);
  };

  const handleCreateBassin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || newInitialCount <= 0) return;
    onAddBassin({
      name: newName,
      species: newSpecies,
      initialCount: newInitialCount,
      stockingDate: newStockingDate,
      status: 'active'
    });
    setNewName('');
    setShowCreateForm(false);
  };

  const handleEditBassin = (bassin: FishBassin) => {
    const name = window.prompt('Nom du bassin', bassin.name);
    if (!name) return;
    const species = window.prompt('Espèce de poisson', bassin.species) ?? bassin.species;
    onUpdateBassin(bassin.id, { name, species });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      maximumFractionDigits: 0
    }).format(val) + ' ' + currency;
  };

  return (
    <div id="pisciculture-view" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <Fish className="w-5 h-5 text-sky-500" />
            Module Pisciculture & Aquaculture
          </h2>
          <p className="text-xs text-slate-500">
            Gestion des bacs béton, suivi des paramètres physico-chimiques (pH, Température) et alimentation.
          </p>
        </div>
        {role === 'admin' ? (
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/15 transition hover:-translate-y-0.5 hover:bg-sky-700"
          >
            <Plus className="w-4 h-4" /> Créer un bassin
          </button>
        ) : (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            <Lock className="w-3 h-3" /> Lecture Seule (Propriétaire)
          </span>
        )}
      </div>

      {showCreateForm && role === 'admin' && (
        <form onSubmit={handleCreateBassin} className="bg-white border border-sky-100 p-5 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom du bassin" className="border border-slate-200 rounded-2xl p-2.5 text-xs" />
          <input value={newSpecies} onChange={(e) => setNewSpecies(e.target.value)} placeholder="Espèce" className="border border-slate-200 rounded-2xl p-2.5 text-xs" />
          <input type="number" min={1} value={newInitialCount} onChange={(e) => setNewInitialCount(Number(e.target.value))} placeholder="Effectif initial" className="border border-slate-200 rounded-2xl p-2.5 text-xs" />
          <input type="date" value={newStockingDate} onChange={(e) => setNewStockingDate(e.target.value)} className="border border-slate-200 rounded-2xl p-2.5 text-xs" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCreateForm(false)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700">Annuler</button>
            <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white">Créer</button>
          </div>
        </form>
      )}

      {/* Grid showing active ponds */}
      {bassins.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Aucun bassin piscicole enregistré pour cette ferme.</p>
          <p className="mt-2 text-xs text-slate-500">
            Les bassins apparaîtront ici avec leur biomasse, leur qualité d’eau et leurs opérations d’alimentation ou de récolte.
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bassins.map((bassin) => {
          const survivalRate = bassin.initialCount > 0 ? ((bassin.currentCount / bassin.initialCount) * 100).toFixed(1) : "0";

          return (
            <div
              key={bassin.id}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow transition-all relative overflow-hidden"
            >
              {/* Soft background decorative water lines */}
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 text-sky-50 opacity-10 pointer-events-none">
                <Droplet className="w-48 h-48" />
              </div>

              {/* Header card info */}
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <h3 className="font-bold text-slate-900 font-sans tracking-tight">
                    {bassin.name}
                  </h3>
                  <span className="text-[11px] text-sky-600 font-semibold bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {bassin.species}
                  </span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                  bassin.status === 'active' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {bassin.status === 'active' ? 'En Production' : 'Récolté / Inactif'}
                </span>
              </div>

              {/* Physicochemical params */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                <div className="flex flex-col justify-center items-center">
                  <span className="text-[9px] text-slate-400 font-semibold uppercase flex items-center gap-0.5">
                    <Thermometer className="w-3 h-3 text-orange-500" /> Temp
                  </span>
                  <span className="text-xs font-bold text-slate-700 mt-0.5">
                    {bassin.waterTemperature ? `${bassin.waterTemperature} °C` : '--'}
                  </span>
                </div>
                <div className="flex flex-col justify-center items-center border-x border-slate-200">
                  <span className="text-[9px] text-slate-400 font-semibold uppercase flex items-center gap-0.5">
                    <Droplet className="w-3 h-3 text-sky-500" /> pH Eau
                  </span>
                  <span className="text-xs font-bold text-slate-700 mt-0.5">
                    {bassin.waterPh ? bassin.waterPh : '--'}
                  </span>
                </div>
                <div className="flex flex-col justify-center items-center">
                  <span className="text-[9px] text-slate-400 font-semibold uppercase flex items-center gap-0.5">
                    <Activity className="w-3 h-3 text-emerald-500" /> Survie
                  </span>
                  <span className="text-xs font-bold text-emerald-600 mt-0.5">
                    {survivalRate}%
                  </span>
                </div>
              </div>

              {/* Numeric fish inventory */}
              <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Date d'empoissonnement :</span>
                  <span className="font-semibold text-slate-700">{bassin.stockingDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Effectif Initial :</span>
                  <span className="font-semibold text-slate-700">{bassin.initialCount} alevins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Effectif Estimé Actuel :</span>
                  <span className="font-bold text-slate-800">{bassin.currentCount} poissons</span>
                </div>
                {bassin.mortalityCount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Mortalité constatée :</span>
                    <span className="font-bold">{bassin.mortalityCount} poissons</span>
                  </div>
                )}
              </div>

              {/* Connected interactive actions (Admin only) */}
              {role === 'admin' && bassin.status === 'active' && (
                <div className="pt-3 border-t border-slate-50 space-y-3">
                  {/* Feed actions drawer */}
                  {selectedBassinId === bassin.id ? (
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-3.5 animate-fade-in text-xs">
                      <h4 className="font-bold text-slate-800">Distribuer de la nourriture</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Aliment en stock</label>
                          <select
                            id="feed-article-select"
                            value={feedArticleId}
                            onChange={(e) => setFeedArticleId(e.target.value)}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded-2xl shadow-sm focus:outline-none bg-white"
                          >
                            <option value="">Sélectionner</option>
                            {foodArticles.map((art) => (
                              <option key={art.id} value={art.id}>
                                {art.name} ({art.quantity} kg dispo)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Quantité (kg)</label>
                          <input
                            id="feed-qty-input"
                            type="number"
                            min={1}
                            value={feedQuantity}
                            onChange={(e) => setFeedQuantity(Number(e.target.value))}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded-2xl shadow-sm focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-sky-50 border border-sky-100 p-2 rounded text-[10px] text-sky-800 leading-normal">
                        <span>💡 Le stock d'aliment va diminuer de {feedQuantity} kg automatiquement.</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedBassinId(null)}
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-3.5 py-2 text-[10px] font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedSubmit(bassin.id)}
                            className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-3.5 py-2 text-[10px] font-semibold text-white shadow-lg shadow-sky-900/15 transition hover:-translate-y-0.5 hover:bg-sky-700"
                          >
                            Valider
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : harvestBassinId === bassin.id ? (
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-3 animate-fade-in text-xs">
                      <h4 className="font-bold text-slate-800">Récolter et enregistrer la vente</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Poissons récoltés</label>
                          <input
                            id="harvest-count-input"
                            type="number"
                            min={1}
                            max={bassin.currentCount}
                            value={harvestCount}
                            onChange={(e) => setHarvestCount(Number(e.target.value))}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded-2xl shadow-sm focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Revenu total obtenu ({currency})</label>
                          <input
                            id="harvest-revenue-input"
                            type="number"
                            min={1}
                            value={harvestRevenue}
                            onChange={(e) => setHarvestRevenue(Number(e.target.value))}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded-2xl shadow-sm focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-2 rounded text-[10px] text-emerald-800 leading-normal">
                        <span>💡 Cette action va clôturer/récolter le bassin et générer un revenu de {formatCurrency(harvestRevenue)}.</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setHarvestBassinId(null)}
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-3.5 py-2 text-[10px] font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={() => handleHarvestSubmit(bassin.id)}
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-3.5 py-2 text-[10px] font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
                          >
                            Récolter
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedBassinId(bassin.id);
                          setFeedArticleId(foodArticles[0]?.id || '');
                          setHarvestBassinId(null);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-[10px] font-semibold text-white shadow-lg shadow-sky-900/15 transition hover:-translate-y-0.5 hover:bg-sky-700"
                      >
                        <Zap className="w-3 h-3" /> Nourrir
                      </button>
                      <button
                        onClick={() => {
                          setHarvestBassinId(bassin.id);
                          setHarvestCount(bassin.currentCount);
                          setHarvestRevenue(bassin.currentCount * 500); // 500 currency / fish estim
                          setSelectedBassinId(null);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-[10px] font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
                      >
                        Récolter / Vendre
                      </button>
                      </div>
                      <AdminEntityActions
                        compact
                        onEdit={() => handleEditBassin(bassin)}
                        onDelete={() => {
                          if (window.confirm(`Supprimer le bassin ${bassin.name} ?`)) {
                            onDeleteBassin(bassin.id);
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
    </div>
  );
}

