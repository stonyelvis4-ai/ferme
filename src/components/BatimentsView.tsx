/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Building2, Users, AlertTriangle, Lock, Plus } from 'lucide-react';
import { Building, Lot, UserRole } from '../types';
import AdminEntityActions from './AdminEntityActions';
import FormDialog from './FormDialog';

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
  const buildingTypeOptions: Array<{ value: Building['type']; label: string; hint: string }> = [
    { value: 'poulailler', label: 'Poulailler', hint: 'Lots de volailles et circuits d elevage.' },
    { value: 'etable', label: 'Etable', hint: 'Bovins, ovins, caprins ou porcs.' },
    { value: 'pisciculture', label: 'Pisciculture', hint: 'Bassins, bacs ou zones aquacoles.' },
    { value: 'magasin', label: 'Magasin', hint: 'Intrants, aliments et consommables.' },
    { value: 'autre', label: 'Autre', hint: 'Infrastructure technique ou usage mixte.' }
  ];

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<Building['type']>('poulailler');
  const [capacity, setCapacity] = useState(1000);
  const [notes, setNotes] = useState('');
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editBuildingName, setEditBuildingName] = useState('');

  const usageLabel = type === 'magasin' ? 'stockage / intrants' : type === 'pisciculture' ? 'zone aquacole' : 'hebergement / production';
  const selectedTypeOption = buildingTypeOptions.find((option) => option.value === type) ?? buildingTypeOptions[0];

  const handleCreateBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || capacity <= 0) return;

    onAddBuilding({ name, type, capacity, notes });
    setName('');
    setType('poulailler');
    setCapacity(1000);
    setNotes('');
    setShowCreateForm(false);
  };

  const handleSubmitBuildingEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBuildingId || !editBuildingName.trim()) return;

    onUpdateBuilding(editingBuildingId, { name: editBuildingName.trim() });
    setEditingBuildingId(null);
    setEditBuildingName('');
  };

  return (
    <div id="batiments-view" className="space-y-6">
      <FormDialog
        open={editingBuildingId !== null}
        title="Renommer le batiment"
        subtitle="Utilisez un nom clair pour faciliter les affectations et les rapports."
        confirmLabel="Enregistrer"
        confirmDisabled={!editBuildingName.trim()}
        onCancel={() => {
          setEditingBuildingId(null);
          setEditBuildingName('');
        }}
        onSubmit={handleSubmitBuildingEdit}
      >
        <label className="space-y-1.5">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Nom du batiment</span>
          <input
            autoFocus
            value={editBuildingName}
            onChange={(e) => setEditBuildingName(e.target.value)}
            placeholder="Ex. Poulailler A1"
            className="w-full rounded-2xl border border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </FormDialog>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
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
          <div className="md:col-span-5 grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Infrastructure</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{name || 'Nom en attente'}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Type: {selectedTypeOption.label}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Capacite prevue</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{capacity.toLocaleString('fr-FR')}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Base de controle des affectations et surcharges.</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Usage metier</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{usageLabel}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Aide le classement dans les autres modules.</p>
            </div>
          </div>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Nom du batiment</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Poulailler A1" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            <span className="block text-[10px] text-slate-500">Nom visible dans les affectations.</span>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as Building['type'])} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100">
              {buildingTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="block text-[10px] text-slate-500">{selectedTypeOption.hint}</span>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Capacite</span>
            <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} placeholder="Ex. 1000" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            <span className="block text-[10px] text-slate-500">Nombre maximal de sujets ou unite de stockage.</span>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. Zone ventilee, acces limite en saison des pluies" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            <span className="block text-[10px] text-slate-500">Observation facultative utile pour la logistique ou la securite.</span>
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
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
                        setEditingBuildingId(building.id);
                        setEditBuildingName(building.name);
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
