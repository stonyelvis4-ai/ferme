/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Calendar, CheckCircle2, DollarSign, Package, Lock, Plus } from 'lucide-react';
import { SanitaryTreatment, Lot, StockArticle, UserRole } from '../types';
import AdminEntityActions from './AdminEntityActions';
import FormDialog from './FormDialog';

interface SanitaireViewProps {
  role: UserRole;
  treatments: SanitaryTreatment[];
  lots: Lot[];
  articles: StockArticle[];
  currency: string;
  onCompleteTreatment: (treatmentId: string) => void;
  onAddTreatment: (data: Omit<SanitaryTreatment, 'id' | 'status'>) => void;
  onUpdateTreatment: (treatmentId: string, updates: Partial<SanitaryTreatment>) => void;
  onDeleteTreatment: (treatmentId: string) => void;
}

export default function SanitaireView({
  role,
  treatments,
  lots,
  articles,
  currency,
  onCompleteTreatment,
  onAddTreatment,
  onUpdateTreatment,
  onDeleteTreatment
}: SanitaireViewProps) {
  const availableLots = lots.filter((lot) => lot.status === 'active');
  const filteredArticles = articles.filter((article) => {
    const haystack = `${article.category ?? ''} ${article.categoryLabel ?? ''} ${article.name}`.toLowerCase();
    return article.isActive !== false && (
      haystack.includes('medicament') ||
      haystack.includes('médicament') ||
      haystack.includes('vaccin') ||
      haystack.includes('veterinaire') ||
      haystack.includes('vétérinaire') ||
      haystack.includes('sanitaire')
    );
  });
  const availableArticles = filteredArticles.length > 0 ? filteredArticles : articles.filter((article) => article.isActive !== false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [lotId, setLotId] = useState(availableLots[0]?.id || '');
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dosage, setDosage] = useState('0.5 ml/sujet');
  const [productId, setProductId] = useState(availableArticles[0]?.id || '');
  const [quantityUsed, setQuantityUsed] = useState(1);
  const [cost, setCost] = useState(10000);
  const [editingTreatmentId, setEditingTreatmentId] = useState<string | null>(null);
  const [editTreatmentName, setEditTreatmentName] = useState('');

  const selectedLot = availableLots.find((item) => item.id === lotId) ?? lots.find((item) => item.id === lotId);
  const selectedArticle = availableArticles.find((item) => item.id === productId) ?? articles.find((item) => item.id === productId);

  useEffect(() => {
    if (availableLots.length === 0) {
      if (lotId) setLotId('');
      return;
    }

    if (!lotId || !availableLots.some((lot) => lot.id === lotId)) {
      setLotId(availableLots[0].id);
    }
  }, [availableLots, lotId]);

  useEffect(() => {
    if (availableArticles.length === 0) {
      if (productId) setProductId('');
      return;
    }

    if (!productId || !availableArticles.some((article) => article.id === productId)) {
      setProductId(availableArticles[0].id);
    }
  }, [availableArticles, productId]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(val) + ' ' + currency;

  const handleCreateTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotId || !name || !productId) return;

    onAddTreatment({
      lotId,
      type: 'treatment',
      name,
      date,
      dosage,
      productId,
      quantityUsed,
      cost
    });

    setName('');
    setShowCreateForm(false);
  };

  const handleSubmitTreatmentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTreatmentId || !editTreatmentName.trim()) return;

    onUpdateTreatment(editingTreatmentId, { name: editTreatmentName.trim() });
    setEditingTreatmentId(null);
    setEditTreatmentName('');
  };

  return (
    <div id="sanitaire-view" className="space-y-6">
      <FormDialog
        open={editingTreatmentId !== null}
        title="Modifier le traitement"
        subtitle="Utilisez un libelle precis pour la tracabilite sanitaire et comptable."
        confirmLabel="Enregistrer"
        confirmDisabled={!editTreatmentName.trim()}
        onCancel={() => {
          setEditingTreatmentId(null);
          setEditTreatmentName('');
        }}
        onSubmit={handleSubmitTreatmentEdit}
      >
        <label className="space-y-1.5">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Nom du traitement</span>
          <input
            autoFocus
            value={editTreatmentName}
            onChange={(e) => setEditTreatmentName(e.target.value)}
            placeholder="Ex. Vaccin Newcastle"
            className="w-full rounded-2xl border border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </FormDialog>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Module Sanitaire & Veterinaire
          </h2>
          <p className="text-xs text-slate-500">
            Suivi des vaccinations, traitements therapeutiques et biosecurite.
          </p>
        </div>
        {role === 'admin' ? (
          <button type="button" onClick={() => setShowCreateForm((prev) => !prev)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Creer un traitement
          </button>
        ) : (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            <Lock className="w-3 h-3" /> Lecture seule (proprietaire)
          </span>
        )}
      </div>

      {showCreateForm && role === 'admin' && (
        <form onSubmit={handleCreateTreatment} className="bg-white border border-emerald-100 p-5 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-6 grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Traitement</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{name || 'Nom en attente'}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Lot: {selectedLot?.name || 'a choisir'}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Produit stock</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{selectedArticle?.name || 'Produit a choisir'}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Quantite prevue: {quantityUsed} {selectedArticle?.unit || 'unites'}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Impact financier</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{formatCurrency(cost)}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Montant repris dans la comptabilite sanitaire.</p>
            </div>
          </div>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Lot concerne</span>
            <select value={lotId} onChange={(e) => setLotId(e.target.value)} disabled={availableLots.length === 0} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100">
              {availableLots.length === 0 ? <option value="">Aucun lot actif disponible</option> : null}
              {availableLots.map((lot) => <option key={lot.id} value={lot.id}>{lot.name}</option>)}
            </select>
            <span className="block text-[10px] text-slate-500">{availableLots.length === 0 ? "Ajoutez ou reactivez un lot pour planifier un traitement." : 'Animaux a traiter.'}</span>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Traitement</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Vaccin Newcastle" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            <span className="block text-[10px] text-slate-500">Nom du vaccin ou soin.</span>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Date prevue</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            <span className="block text-[10px] text-slate-500">Date d'administration.</span>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Dosage</span>
            <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="Ex. 1 ml / sujet" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            <span className="block text-[10px] text-slate-500">Indication utile pour la tracabilite sanitaire.</span>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Produit stock</span>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} disabled={availableArticles.length === 0} className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100">
              {availableArticles.length === 0 ? <option value="">Aucun produit sanitaire disponible</option> : null}
              {availableArticles.map((article) => <option key={article.id} value={article.id}>{article.name}</option>)}
            </select>
            <span className="block text-[10px] text-slate-500">{availableArticles.length === 0 ? "Ajoutez un article sanitaire ou veterinaire dans le stock pour l'utiliser ici." : 'Article deduit du stock.'}</span>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Quantite utilisee</span>
            <input type="number" min={0.1} step={0.1} value={quantityUsed} onChange={(e) => setQuantityUsed(Number(e.target.value))} placeholder="Ex. 2" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            <span className="block text-[10px] text-slate-500">Quantite consommee en stock pour ce soin.</span>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">Cout</span>
            <input type="number" min={1} value={cost} onChange={(e) => setCost(Number(e.target.value))} placeholder="Ex. 15000" className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            <span className="block text-[10px] text-slate-500">Montant a comptabiliser.</span>
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" onClick={() => setShowCreateForm(false)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700">Annuler</button>
            <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:border-emerald-800 hover:bg-emerald-700">Creer</button>
          </div>
        </form>
      )}

      {treatments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Aucun traitement sanitaire synchronise pour le moment.</p>
          <p className="mt-2 text-xs text-slate-500">Les campagnes de vaccination et traitements apparaitront ici.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {treatments.map((treatment) => {
            const lot = lots.find((lotItem) => lotItem.id === treatment.lotId);
            const article = articles.find((articleItem) => articleItem.id === treatment.productId);
            const isCompleted = treatment.status === 'completed';

            return (
              <div key={treatment.id} className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 hover:shadow transition-shadow relative overflow-hidden ${isCompleted ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100'}`}>
                {isCompleted && (
                  <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                )}

                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 font-sans tracking-tight text-sm">{treatment.name}</h3>
                    <span className="text-[10px] font-semibold uppercase mt-1 px-2 py-0.5 rounded-full inline-block bg-amber-100 text-amber-700">
                      {treatment.type === 'vaccine' ? 'Vaccination' : 'Traitement'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {isCompleted ? 'Realise' : 'Planifie'}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lot rattache :</span>
                    <span className="font-bold text-slate-800">{lot?.name || 'Inconnu'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date :</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {treatment.date}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dosage :</span>
                    <span className="font-semibold text-slate-700">{treatment.dosage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Produit :</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      {article?.name || 'Inconnu'} ({treatment.quantityUsed} {article?.unit || 'unites'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Cout :</span>
                    <span className="font-bold text-rose-600 font-mono flex items-center gap-0.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      {formatCurrency(treatment.cost)}
                    </span>
                  </div>
                </div>

                {role === 'admin' && (
                  <div className="pt-3 border-t border-slate-50 space-y-2">
                    {!isCompleted && (
                      <button
                        onClick={() => onCompleteTreatment(treatment.id)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-[11px] font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Marquer comme administre
                      </button>
                    )}
                    <AdminEntityActions
                      compact
                      onEdit={() => {
                        setEditingTreatmentId(treatment.id);
                        setEditTreatmentName(treatment.name);
                      }}
                      onDelete={() => {
                        if (window.confirm(`Supprimer le traitement ${treatment.name} ?`)) {
                          onDeleteTreatment(treatment.id);
                        }
                      }}
                    />
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
