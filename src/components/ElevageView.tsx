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
  MessageSquare
} from 'lucide-react';
import { Lot, Building, UserRole } from '../types';
import AdminEntityActions from './AdminEntityActions';

interface ElevageViewProps {
  role: UserRole;
  lots: Lot[];
  buildings: Building[];
  currency: string;
  onAddLot: (newLot: Omit<Lot, 'id' | 'currentCount' | 'mortalityCount'>) => void;
  onReportMortality: (lotId: string, count: number) => void;
  onUpdateLot: (lotId: string, updates: Partial<Lot>) => void;
  onDeleteLot: (lotId: string) => void;
}

export default function ElevageView({
  role,
  lots,
  buildings,
  currency,
  onAddLot,
  onReportMortality,
  onUpdateLot,
  onDeleteLot
}: ElevageViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
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
      notes
    });

    setName('');
    setUnitCost(0);
    setShowAddForm(false);
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
          <button
            id="btn-add-lot"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Nouveau lot d'animaux
          </button>
        ) : (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            <Lock className="w-3 h-3" /> Lecture seule (proprietaire)
          </span>
        )}
      </div>

      {showAddForm && role === 'admin' && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in"
        >
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2">
            Creer un nouveau lot d'animaux
          </h3>

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
              <p className="mt-1 text-[10px] text-slate-500">Race, souche ou variété animale.</p>
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
              <p className="mt-1 text-[10px] text-slate-500">Lieu d'hébergement du lot.</p>
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
              <p className="mt-1 text-[10px] text-slate-500">Nombre d'animaux à l'entrée.</p>
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
              <p className="mt-1 text-[10px] text-slate-500">Date d'arrivée dans la ferme.</p>
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
                Coût total : {(initialCount * unitCost).toLocaleString('fr-FR')} {currency}
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
              placeholder="Ex. Lot vacciné à l'arrivée, fournisseur X"
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
                          onClick={() => handleMortalitySubmit(lot.id)}
                          className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3.5 py-2 text-[10px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-700"
                        >
                          Valider
                        </button>
                        <button
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
    </div>
  );
}
