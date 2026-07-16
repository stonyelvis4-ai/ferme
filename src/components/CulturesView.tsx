/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sprout, Plus, Map, Layers, Lock, Scissors } from 'lucide-react';
import { CultureParcelle, Campaign, UserRole } from '../types';
import AdminEntityActions from './AdminEntityActions';

interface CulturesViewProps {
  role: UserRole;
  parcelles: CultureParcelle[];
  campaigns: Campaign[];
  currency: string;
  onHarvestCampaign: (campaignId: string, actualYieldTons: number, salesRevenue: number) => void;
  onAddParcelle: (data: Omit<CultureParcelle, 'id'>) => void;
  onUpdateParcelle: (parcelleId: string, updates: Partial<CultureParcelle>) => void;
  onDeleteParcelle: (parcelleId: string) => void;
  onAddCampaign: (data: Omit<Campaign, 'id' | 'expenses' | 'revenues'>) => void;
  onUpdateCampaign: (campaignId: string, updates: Partial<Campaign>) => void;
  onDeleteCampaign: (campaignId: string) => void;
}

export default function CulturesView({
  role,
  parcelles,
  campaigns,
  currency,
  onHarvestCampaign,
  onAddParcelle,
  onUpdateParcelle,
  onDeleteParcelle,
  onAddCampaign,
  onUpdateCampaign,
  onDeleteCampaign
}: CulturesViewProps) {
  const [showParcelleForm, setShowParcelleForm] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [harvestCampId, setHarvestCampId] = useState<string | null>(null);
  const [actualYield, setActualYield] = useState(15);
  const [salesRevenue, setSalesRevenue] = useState(800000);
  const [parcelleName, setParcelleName] = useState('');
  const [parcelleArea, setParcelleArea] = useState(1);
  const [parcelleSoil, setParcelleSoil] = useState('Argileux');
  const [campaignParcelleId, setCampaignParcelleId] = useState('');
  const [campaignCropType, setCampaignCropType] = useState('Mais');
  const [campaignVariety, setCampaignVariety] = useState('Standard');
  const [campaignStartDate, setCampaignStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [campaignYield, setCampaignYield] = useState(3);
  const selectedCampaignParcelle = parcelles.find((item) => item.id === campaignParcelleId);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(val) + ' ' + currency;

  const handleHarvestSubmit = (campId: string) => {
    if (actualYield <= 0 || salesRevenue < 0) return;
    onHarvestCampaign(campId, actualYield, salesRevenue);
    setHarvestCampId(null);
  };

  const handleCreateParcelle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parcelleName || parcelleArea <= 0) return;
    onAddParcelle({ name: parcelleName, area: parcelleArea, soilType: parcelleSoil, status: 'preparing' });
    setParcelleName('');
    setShowParcelleForm(false);
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignParcelleId || !campaignCropType) return;
    onAddCampaign({
      parcelleId: campaignParcelleId,
      cropType: campaignCropType,
      variety: campaignVariety,
      startDate: campaignStartDate,
      status: 'growing',
      expectedYield: campaignYield
    });
    setShowCampaignForm(false);
  };

  return (
    <div id="cultures-view" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <Sprout className="w-5 h-5 text-lime-600" />
            Module Cultures & Campagnes Agricoles
          </h2>
          <p className="text-xs text-slate-500">
            Cartographie des parcelles cultivables, suivi des stades de vegetation et recoltes.
          </p>
        </div>
        {role === 'admin' ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowParcelleForm((prev) => !prev)} className="inline-flex items-center gap-2 rounded-full bg-lime-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-lime-900/15 transition hover:-translate-y-0.5 hover:bg-lime-700">
              <Plus className="w-4 h-4" /> Creer une parcelle
            </button>
            <button type="button" onClick={() => setShowCampaignForm((prev) => !prev)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700">
              <Plus className="w-4 h-4" /> Creer une campagne
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            <Lock className="w-3 h-3" /> Lecture seule (proprietaire)
          </span>
        )}
      </div>

      {showParcelleForm && role === 'admin' && (
        <form onSubmit={handleCreateParcelle} className="bg-white border border-lime-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl border border-lime-100 bg-lime-50/60 p-4">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-lime-700">Parcelle</span>
              <span className="mt-1 block text-sm font-semibold text-lime-900">{parcelleName || 'Nom en attente'}</span>
              <p className="mt-1 text-[11px] text-lime-800">Surface prevue: {parcelleArea > 0 ? `${parcelleArea} ha` : 'a renseigner'}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-lime-700">Type de sol</span>
              <span className="mt-1 block text-sm font-semibold text-lime-900">{parcelleSoil || 'Sol non renseigne'}</span>
              <p className="mt-1 text-[11px] text-lime-800">Cette information aidera au choix des cultures.</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-lime-700">Lecture rapide</span>
              <span className="mt-1 block text-sm font-semibold text-lime-900">{parcelleArea >= 1 ? 'Parcelle exploitable' : 'Micro-zone ou test'}</span>
              <p className="mt-1 text-[11px] text-lime-800">Le plan cultural utilisera cette base.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Nom parcelle</span>
              <input value={parcelleName} onChange={(e) => setParcelleName(e.target.value)} placeholder="Ex. Champ Sud P1" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100" />
              <span className="block text-[10px] text-slate-500">Nom utilise pour les campagnes.</span>
            </label>
            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Superficie</span>
              <input type="number" min={0.1} step={0.1} value={parcelleArea} onChange={(e) => setParcelleArea(Number(e.target.value))} placeholder="Ex. 1.5 ha" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100" />
              <span className="block text-[10px] text-slate-500">Surface cultivable en hectares.</span>
            </label>
            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Type de sol</span>
              <input value={parcelleSoil} onChange={(e) => setParcelleSoil(e.target.value)} placeholder="Ex. Argileux" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-100" />
              <span className="block text-[10px] text-slate-500">Texture ou observation du sol.</span>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowParcelleForm(false)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700">Annuler</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-lime-600 px-4 py-2 text-xs font-semibold text-white">Creer</button>
            </div>
          </div>
        </form>
      )}

      {showCampaignForm && role === 'admin' && (
        <form onSubmit={handleCreateCampaign} className="bg-white border border-emerald-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Campagne</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{campaignCropType || 'Culture a choisir'}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Variete: {campaignVariety || 'non precisee'}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Parcelle liee</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{selectedCampaignParcelle?.name || 'Parcelle a selectionner'}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Surface: {selectedCampaignParcelle ? `${selectedCampaignParcelle.area} ha` : 'indisponible'}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Projection</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{campaignYield} t/ha attendues</span>
              <p className="mt-1 text-[11px] text-emerald-800">Repere initial pour suivre la performance.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Parcelle</span>
              <select value={campaignParcelleId} onChange={(e) => setCampaignParcelleId(e.target.value)} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100">
                <option value="">Parcelle</option>
                {parcelles.map((parcelle) => <option key={parcelle.id} value={parcelle.id}>{parcelle.name}</option>)}
              </select>
              <span className="block text-[10px] text-slate-500">Terrain affecte a la culture.</span>
            </label>
            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Culture</span>
              <input value={campaignCropType} onChange={(e) => setCampaignCropType(e.target.value)} placeholder="Ex. Mais" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Espece cultivee.</span>
            </label>
            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Variete</span>
              <input value={campaignVariety} onChange={(e) => setCampaignVariety(e.target.value)} placeholder="Ex. Composite jaune" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Variete ou semence utilisee.</span>
            </label>
            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Date de semis</span>
              <input type="date" value={campaignStartDate} onChange={(e) => setCampaignStartDate(e.target.value)} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Debut de la campagne.</span>
            </label>
            <label className="space-y-1.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Rendement attendu</span>
              <input type="number" min={0.1} step={0.1} value={campaignYield} onChange={(e) => setCampaignYield(Number(e.target.value))} placeholder="Ex. 3.5" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <span className="block text-[10px] text-slate-500">Estimation initiale en tonne par hectare.</span>
            </label>
            <div className="md:col-span-5 flex gap-2">
              <button type="button" onClick={() => setShowCampaignForm(false)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700">Annuler</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:border-emerald-800 hover:bg-emerald-700">Creer</button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
          <Map className="w-4 h-4 text-emerald-600" />
          Plan de l'exploitation ({parcelles.length} parcelles)
        </h3>

        {parcelles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">Aucune parcelle enregistree pour cette ferme.</p>
            <p className="mt-2 text-xs text-slate-500">Les parcelles et plans culturaux s'afficheront ici des leur creation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {parcelles.map((parcelle) => {
              const isFallow = parcelle.status === 'fallow';
              return (
                <div key={parcelle.id} className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${isFallow ? 'bg-amber-50/40 border-amber-200/40' : 'bg-emerald-50/30 border-emerald-100'}`}>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-xs">{parcelle.name}</h4>
                    <p className="text-[10px] text-slate-400 uppercase mt-0.5">{parcelle.soilType}</p>
                  </div>
                  <div className="mt-4 space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">{parcelle.area} hectares</span>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${isFallow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isFallow ? 'Jachere' : 'Cultivee'}
                      </span>
                    </div>
                    {role === 'admin' && (
                      <AdminEntityActions
                        compact
                        onEdit={() => {
                          const name = window.prompt('Nom de la parcelle', parcelle.name);
                          if (!name) return;
                          onUpdateParcelle(parcelle.id, { name });
                        }}
                        onDelete={() => {
                          if (window.confirm(`Supprimer la parcelle ${parcelle.name} ?`)) {
                            onDeleteParcelle(parcelle.id);
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

      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          Campagnes de production agricoles
        </h3>

        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-700">Aucune campagne culturale active.</p>
            <p className="mt-2 text-xs text-slate-500">Les semis, operations et recoltes apparaitront ici quand une culture sera lancee.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map((camp) => {
              const parcelle = parcelles.find((p) => p.id === camp.parcelleId);
              return (
                <div key={camp.id} className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 hover:shadow transition-shadow ${camp.status === 'harvested' ? 'border-slate-200 bg-slate-50/50' : 'border-slate-100'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Culture de {camp.cropType}</h4>
                      <span className="text-[11px] text-slate-400">Variete : {camp.variety}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase ${camp.status === 'growing' ? 'bg-lime-100 text-lime-700' : camp.status === 'harvested' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                      {camp.status === 'growing' ? 'Croissance' : camp.status === 'harvested' ? 'Recoltee' : 'Preparation'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 pt-2">
                    <div className="space-y-1">
                      <span className="text-slate-400 block">Parcelle :</span>
                      <span className="font-bold text-slate-700">{parcelle?.name || 'Inconnue'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 block">Date de semis :</span>
                      <span className="font-bold text-slate-700">{camp.startDate}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 block">Rendement attendu :</span>
                      <span className="font-bold text-slate-700">{camp.expectedYield} t/ha</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 block">Depenses engagees :</span>
                      <span className="font-bold text-rose-600 font-mono">{formatCurrency(camp.expenses)}</span>
                    </div>
                  </div>

                  {camp.status === 'harvested' && camp.actualYield && (
                    <div className="bg-emerald-50/40 border border-emerald-100 p-3 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-emerald-800 font-medium">Rendement recolte :</span>
                        <span className="font-bold text-emerald-900">{camp.actualYield} tonnes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-800 font-medium">Revenus :</span>
                        <span className="font-bold text-emerald-900 font-mono">{formatCurrency(camp.revenues)}</span>
                      </div>
                    </div>
                  )}

                  {role === 'admin' && camp.status === 'growing' && (
                    <div className="pt-3 border-t border-slate-50">
                      {harvestCampId === camp.id ? (
                        <div className="bg-slate-50 p-3 border border-slate-200 rounded-xl space-y-3 animate-fade-in text-xs">
                          <h5 className="font-bold text-slate-800">Enregistrer la recolte</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" min={0.1} step={0.1} value={actualYield} onChange={(e) => setActualYield(Number(e.target.value))} className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white focus:outline-none" />
                            <input type="number" min={0} value={salesRevenue} onChange={(e) => setSalesRevenue(Number(e.target.value))} className="w-full text-xs p-1.5 border border-slate-200 rounded bg-white focus:outline-none" />
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-100 p-2 rounded">
                            <span>La parcelle passera en jachere et le revenu sera ajoute.</span>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => setHarvestCampId(null)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-3.5 py-2 text-[10px] font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700">Annuler</button>
                              <button type="button" onClick={() => handleHarvestSubmit(camp.id)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-3.5 py-2 text-[10px] font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:border-emerald-800 hover:bg-emerald-700">Valider</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              setHarvestCampId(camp.id);
                              setActualYield(Math.round((parcelle?.area || 1) * camp.expectedYield * 10) / 10);
                              setSalesRevenue(Math.round((parcelle?.area || 1) * camp.expectedYield * 120000));
                            }}
                            className="w-full bg-lime-600 hover:bg-lime-700 text-white text-[10px] font-semibold py-2 rounded-2xl shadow-sm transition-colors flex items-center justify-center gap-1"
                          >
                            <Scissors className="w-3.5 h-3.5" /> Recolter la parcelle
                          </button>
                          <AdminEntityActions
                            compact
                            onEdit={() => {
                              const variety = window.prompt('Variete', camp.variety);
                              if (!variety) return;
                              onUpdateCampaign(camp.id, { variety });
                            }}
                            onDelete={() => {
                              if (window.confirm(`Supprimer la campagne ${camp.cropType} ?`)) {
                                onDeleteCampaign(camp.id);
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
    </div>
  );
}
