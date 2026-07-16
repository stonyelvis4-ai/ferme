/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Egg,
  Plus,
  TrendingUp,
  AlertCircle,
  Package,
  Calendar,
  DollarSign,
  Lock
} from 'lucide-react';
import { EggProduction, Lot, UserRole } from '../types';
import AdminEntityActions from './AdminEntityActions';

interface PondeusesViewProps {
  role: UserRole;
  productions: EggProduction[];
  lots: Lot[];
  currency: string;
  onRecordPonte: (data: Omit<EggProduction, 'id' | 'stockCount'>) => void;
  onSellEggs: (count: number, unitPrice: number, description: string) => void;
  onUpdateEggProduction: (productionId: string, updates: Partial<EggProduction>) => void;
  onDeleteEggProduction: (productionId: string) => void;
}

export default function PondeusesView({
  role,
  productions,
  lots,
  currency,
  onRecordPonte,
  onSellEggs,
  onUpdateEggProduction,
  onDeleteEggProduction
}: PondeusesViewProps) {
  const [showPonteForm, setShowPonteForm] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);

  // Ponte form inputs
  const [lotId, setLotId] = useState(lots.find((l) => l.species.includes("Pondeuses"))?.id || lots[0]?.id || '');
  const [collected, setCollected] = useState(0);
  const [compliant, setCompliant] = useState(0);
  const [broken, setBroken] = useState(0);
  const [losses, setLosses] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Sale form inputs
  const [saleCount, setSaleCount] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [saleDescription, setSaleDescription] = useState('');
  const layingLots = lots.filter((l) => l.species.includes("Pondeuses"));

  useEffect(() => {
    if (!lotId && layingLots.length > 0) {
      setLotId(layingLots[0].id);
    }
  }, [layingLots, lotId]);

  const handlePonteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotId || collected <= 0) return;

    onRecordPonte({
      date,
      lotId,
      collectedCount: collected,
      compliantCount: compliant,
      brokenCount: broken,
      lossesCount: losses,
      soldCount: 0
    });

    setShowPonteForm(false);
  };

  const handleSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saleCount <= 0 || unitPrice <= 0) return;

    onSellEggs(saleCount, unitPrice, saleDescription);
    setShowSaleForm(false);
  };

  // Get current egg stock from latest production or custom calc
  const eggStock = productions.length > 0 ? productions[productions.length - 1].stockCount : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      maximumFractionDigits: 0
    }).format(val) + ' ' + currency;
  };

  const totalCollected = productions.reduce((sum, production) => sum + production.collectedCount, 0);
  const totalCompliant = productions.reduce((sum, production) => sum + production.compliantCount, 0);
  const totalLosses = productions.reduce((sum, production) => sum + production.brokenCount + production.lossesCount, 0);
  const qualityRate = totalCollected > 0 ? (totalCompliant / totalCollected) * 100 : 0;
  const lossRate = totalCollected > 0 ? (totalLosses / totalCollected) * 100 : 0;
  const lastProduction = productions.length > 0 ? productions[productions.length - 1] : null;
  const referenceLot = layingLots.find((lot) => lot.id === lastProduction?.lotId) ?? layingLots[0];
  const lastLayingRate = lastProduction && referenceLot
    ? (lastProduction.collectedCount / Math.max(referenceLot.currentCount, 1)) * 100
    : 0;

  const handleEditProduction = (production: EggProduction) => {
    const compliantValue = window.prompt('Oeufs conformes', String(production.compliantCount));
    if (!compliantValue) return;
    const nextCompliant = Number(compliantValue);
    if (!Number.isFinite(nextCompliant) || nextCompliant < 0) return;
    onUpdateEggProduction(production.id, { compliantCount: nextCompliant });
  };

  return (
    <div id="pondeuses-view" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <Egg className="w-5 h-5 text-amber-500" />
            Module Pondeuses & Production d'Œufs
          </h2>
          <p className="text-xs text-slate-500">
            Enregistrement quotidien de la ponte, contrôle qualité et expédition des plateaux d'œufs.
          </p>
        </div>
        {role === 'admin' ? (
          <div className="flex gap-2">
            <button
              id="btn-show-ponte-form"
              onClick={() => {
                setShowPonteForm(!showPonteForm);
                setShowSaleForm(false);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-amber-700 bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:border-amber-800 hover:bg-amber-700"
            >
              <Plus className="w-4 h-4" /> Enregistrer la Ponte
            </button>
            <button
              id="btn-show-sale-form"
              onClick={() => {
                setShowSaleForm(!showSaleForm);
                setShowPonteForm(false);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
            >
              <DollarSign className="w-4 h-4" /> Enregistrer une Vente
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            <Lock className="w-3 h-3" /> Lecture Seule (Propriétaire)
          </span>
        )}
      </div>

      {layingLots.length === 0 && productions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Aucune activité pondeuse synchronisée pour cette ferme.</p>
          <p className="mt-2 text-xs text-slate-500">
            Ajoutez un lot de pondeuses puis enregistrez les collectes pour suivre le stock d’œufs et les ventes.
          </p>
        </div>
      ) : null}

      {/* Overview stats specific to eggs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-white/10">
            <Egg className="w-32 h-32" />
          </div>
          <span className="text-xs text-amber-100 font-semibold uppercase tracking-wider">
            Stock d'Œufs Actuels
          </span>
          <h3 className="text-3xl font-extrabold mt-2 font-mono">
            {eggStock.toLocaleString('fr-FR')}
          </h3>
          <p className="text-[11px] text-amber-100 mt-2">
            Œufs prêts pour la vente en boîte ou plateaux (Disponibles en magasin).
          </p>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
            Qualité de Production (Cumul)
          </span>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div className="bg-emerald-50/50 p-2.5 border border-emerald-100 rounded-2xl">
              <span className="text-[10px] text-emerald-700 font-bold uppercase">Conformes</span>
              <span className="text-lg font-bold text-slate-800 block mt-1">{qualityRate.toFixed(1)}%</span>
            </div>
            <div className="bg-rose-50/50 p-2.5 border border-rose-100 rounded-2xl">
              <span className="text-[10px] text-rose-700 font-bold uppercase">Casse/Pertes</span>
              <span className="text-lg font-bold text-slate-800 block mt-1">{lossRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
            Dernière Collecte
          </span>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Date :</span>
              <span className="font-bold text-slate-700">
                {lastProduction ? lastProduction.date : 'Aucune'}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Œufs collectés :</span>
              <span className="font-bold text-slate-700">
                {lastProduction ? lastProduction.collectedCount : 0}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taux de ponte :</span>
              <span className="font-bold text-amber-600">{lastLayingRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ponte entry form */}
      {showPonteForm && role === 'admin' && (
        <form
          onSubmit={handlePonteSubmit}
          className="bg-white border border-amber-200 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in"
        >
          <h3 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
            <Egg className="w-4 h-4 text-amber-500" />
            Enregistrer la ponte journalière
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Lot de Poules *</label>
              <select
                id="ponte-lot-input"
                value={lotId}
                onChange={(e) => setLotId(e.target.value)}
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
              >
                {layingLots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-500">Lot qui a produit les œufs.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Œufs Collectés *</label>
              <input
                id="ponte-collected-input"
                type="number"
                required
                min={1}
                value={collected}
                onChange={(e) => {
                  setCollected(Number(e.target.value));
                  // Auto-fill compliant roughly
                  setCompliant(Math.floor(Number(e.target.value) * 0.98));
                  setBroken(Math.floor(Number(e.target.value) * 0.01));
                  setLosses(Math.floor(Number(e.target.value) * 0.01));
                }}
                placeholder="Ex. 850"
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
              <p className="mt-1 text-[10px] text-slate-500">Total ramassé avant tri.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Œufs Conformes *</label>
              <input
                id="ponte-compliant-input"
                type="number"
                required
                min={0}
                value={compliant}
                onChange={(e) => setCompliant(Number(e.target.value))}
                placeholder="Ex. 830"
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
              <p className="mt-1 text-[10px] text-slate-500">Œufs vendables après tri.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Œufs Cassés</label>
              <input
                id="ponte-broken-input"
                type="number"
                min={0}
                value={broken}
                onChange={(e) => setBroken(Number(e.target.value))}
                placeholder="Ex. 10"
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
              <p className="mt-1 text-[10px] text-slate-500">Œufs cassés ou invendables.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
              <input
                id="ponte-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
              <p className="mt-1 text-[10px] text-slate-500">Jour de la collecte.</p>
            </div>
          </div>

          <div className="flex justify-between items-center p-3 bg-amber-50 border border-amber-100 rounded-2xl text-[11px] text-amber-800">
            <span>
              ℹ️ <strong>Interconnexion :</strong> Valider cette production de ponte va alimenter le <strong>stock d'œufs</strong> en temps réel, mettre à jour le <strong>taux de ponte</strong> du lot, et inscrire l'action au <strong>journal d'audit</strong>.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPonteForm(false)}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full border border-amber-700 bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:border-amber-800 hover:bg-amber-700"
              >
                Valider la collecte
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Sale entry form */}
      {showSaleForm && role === 'admin' && (
        <form
          onSubmit={handleSaleSubmit}
          className="bg-white border border-emerald-200 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in"
        >
          <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Enregistrer une vente d'œufs
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre d'Œufs à Vendre *</label>
              <input
                id="sale-count-input"
                type="number"
                required
                min={1}
                max={eggStock}
                value={saleCount}
                onChange={(e) => setSaleCount(Number(e.target.value))}
                placeholder="Ex. 300"
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Maximum disponible : {eggStock} œufs</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Prix Unitaire ({currency}/œuf) *</label>
              <input
                id="sale-price-input"
                type="number"
                required
                min={1}
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                placeholder={`Ex. 100 ${currency}`}
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Client</label>
              <input
                id="sale-desc-input"
                type="text"
                value={saleDescription}
                onChange={(e) => setSaleDescription(e.target.value)}
                placeholder="Ex. Client comptoir"
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-1 text-[10px] text-slate-500">Nom du client ou motif de vente.</p>
            </div>
          </div>

          <div className="flex justify-between items-center p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-[11px] text-emerald-800">
            <span>
              ℹ️ <strong>Interconnexion :</strong> Cette vente va déduire les œufs du <strong>stock</strong>, ajouter un <strong>revenu financier de {formatCurrency(saleCount * unitPrice)}</strong> dans la comptabilité, répercuter la rentabilité au <strong>dashboard</strong>, et auditer l'action.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSaleForm(false)}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saleCount > eggStock}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Valider la vente
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Production History Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 font-sans tracking-tight text-sm">
            Historique de Production & Collectes
          </h3>
          <span className="text-xs text-slate-400">Suivi des récoltes d'œufs quotidiennes</span>
        </div>

        <div className="overflow-x-auto">
          {productions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Aucune collecte d’œufs enregistrée pour le moment.
            </div>
          ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Date de Collecte</th>
                <th className="p-4">Lot Référencé</th>
                <th className="p-4 text-center">Œufs Collectés</th>
                <th className="p-4 text-center">Œufs Conformes</th>
                <th className="p-4 text-center">Cassés / Pertes</th>
                <th className="p-4 text-center">Vendus</th>
                <th className="p-4 text-right">Solde Stock Cumulé</th>
                {role === 'admin' && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {productions.slice().reverse().map((p) => {
                const lot = lots.find((l) => l.id === p.lotId);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {p.date}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">{lot?.name || 'Inconnu'}</td>
                    <td className="p-4 text-center font-bold text-amber-600 bg-amber-50/20">{p.collectedCount}</td>
                    <td className="p-4 text-center text-emerald-600 font-medium">{p.compliantCount}</td>
                    <td className="p-4 text-center text-rose-500">{p.brokenCount + p.lossesCount}</td>
                    <td className="p-4 text-center text-slate-500 font-medium">{p.soldCount || '-'}</td>
                    <td className="p-4 text-right font-mono font-bold text-slate-800">{p.stockCount} œufs</td>
                    {role === 'admin' && (
                      <td className="p-4 text-right">
                        <AdminEntityActions
                          compact
                          onEdit={() => handleEditProduction(p)}
                          onDelete={() => {
                            if (window.confirm(`Supprimer la collecte du ${p.date} ?`)) {
                              onDeleteEggProduction(p.id);
                            }
                          }}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
}

