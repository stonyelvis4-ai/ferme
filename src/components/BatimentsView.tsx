/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Building2, Users, AlertTriangle, Lock, Wrench, Plus } from 'lucide-react';
import { Building, Lot, UserRole } from '../types';
import AdminEntityActions from './AdminEntityActions';

interface BatimentsViewProps {
  role: UserRole;
  buildings: Building[];
  lots: Lot[];
  onAddBuilding: (data: Omit<Building, 'id'>) => void;
  onUpdateBuilding: (buildingId: string, updates: Partial<Building>) => void;
  onDeleteBuilding: (buildingId: string) => void;
}

export default function BatimentsView({
  role,
  buildings,
  lots,
  onAddBuilding,
  onUpdateBuilding,
  onDeleteBuilding
}: BatimentsViewProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<Building['type']>('poulailler');
  const [capacity, setCapacity] = useState(1000);
  const [notes, setNotes] = useState('');

  const handleCreateBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || capacity <= 0) return;
    onAddBuilding({ name, type, capacity, notes });
    setName('');
    setShowCreateForm(false);
  };

  return (
    <div id="batiments-view" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Module Batiments, Entrepots & Zones Techniques
          </h2>
          <p className="text-xs text-slate-500">
            Suivi des capacites d'accueil des poulaillers, etables, hangars d'intrants et bacs.
          </p>
        </div>
        {role === 'admin' ? (
          <button type="button" onClick={() => setShowCreateForm((prev) => !prev)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Creer un batiment
          </button>
        ) : (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            <Lock className="w-3 h-3" /> Lecture seule (proprietaire)
          </span>
        )}
      </div>

      {showCreateForm && role === 'admin' && (
        <form onSubmit={handleCreateBuilding} className="bg-white border border-emerald-100 p-5 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du batiment" className="border border-slate-200 rounded-2xl p-2.5 text-xs" />
          <select value={type} onChange={(e) => setType(e.target.value as Building['type'])} className="border border-slate-200 rounded-2xl p-2.5 text-xs bg-white">
            <option value="poulailler">Poulailler</option>
            <option value="étable">Etable</option>
            <option value="pisciculture">Pisciculture</option>
            <option value="magasin">Magasin</option>
            <option value="autre">Autre</option>
          </select>
          <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} placeholder="Capacite" className="border border-slate-200 rounded-2xl p-2.5 text-xs" />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="border border-slate-200 rounded-2xl p-2.5 text-xs" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCreateForm(false)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700">Annuler</button>
            <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:border-emerald-800 hover:bg-emerald-700">Creer</button>
          </div>
        </form>
      )}

      {buildings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Aucune infrastructure enregistree pour cette ferme.</p>
          <p className="mt-2 text-xs text-slate-500">Les batiments et enclos apparaitront ici des qu'ils seront crees.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {buildings.map((building) => {
            const occupyingLots = lots.filter((lot) => lot.buildingId === building.id && lot.status === 'active');
            const totalOccupiedCount = occupyingLots.reduce((sum, lot) => sum + lot.currentCount, 0);
            const occupancyPct = building.capacity > 0 ? (totalOccupiedCount / building.capacity) * 100 : 0;
            const isOverCapacity = totalOccupiedCount > building.capacity;

            return (
              <div key={building.id} className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 hover:shadow transition-shadow ${isOverCapacity ? 'border-rose-300 bg-rose-50/10' : 'border-slate-100'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 font-sans tracking-tight text-sm">{building.name}</h3>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5 inline-block">Type: {building.type}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${isOverCapacity ? 'bg-rose-100 text-rose-700' : occupancyPct > 80 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isOverCapacity ? 'Surcharge' : occupancyPct > 80 ? 'Fortement occupe' : 'Disponible'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span>Densite d'occupation :</span>
                    <span>{totalOccupiedCount.toLocaleString('fr-FR')} / {building.capacity.toLocaleString('fr-FR')} tetes</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isOverCapacity ? 'bg-rose-500' : occupancyPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(occupancyPct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Taux de remplissage : {occupancyPct.toFixed(1)}%</span>
                    {isOverCapacity && (
                      <span className="text-rose-600 font-semibold flex items-center gap-0.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Risque sanitaire
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-50">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Lots occupants ({occupyingLots.length})</span>
                  {occupyingLots.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Aucun lot actif n'est localise ici.</p>
                  ) : (
                    <div className="space-y-2">
                      {occupyingLots.map((lot) => (
                        <div key={lot.id} className="bg-slate-50 border border-slate-100/70 p-2.5 rounded-2xl text-xs flex justify-between items-center">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold">{lot.name}</span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">{lot.currentCount} sujets</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-50 space-y-2">
                  {role === 'admin' && (
                    <AdminEntityActions
                      compact
                      onEdit={() => {
                        const nextName = window.prompt('Nom du batiment', building.name);
                        if (!nextName) return;
                        onUpdateBuilding(building.id, { name: nextName });
                      }}
                      onDelete={() => {
                        if (window.confirm(`Supprimer le batiment ${building.name} ?`)) {
                          onDeleteBuilding(building.id);
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
