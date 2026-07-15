/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Package, Plus, AlertTriangle, RefreshCw, ShoppingBag, History, Lock } from 'lucide-react';
import { StockArticle, StockMovement, UserRole } from '../types';
import AdminEntityActions from './AdminEntityActions';

interface StocksViewProps {
  role: UserRole;
  articles: StockArticle[];
  movements: StockMovement[];
  currency: string;
  onAdjustStock: (articleId: string, quantityToAdd: number, reason: string) => void;
  onGeneratePurchaseTask: (article: StockArticle) => void;
  onAddStockArticle: (data: Omit<StockArticle, 'id'>) => void;
  onUpdateStockArticle: (articleId: string, updates: Partial<StockArticle>) => void;
  onDeleteStockArticle: (articleId: string) => void;
}

export default function StocksView({
  role,
  articles,
  movements,
  currency,
  onAdjustStock,
  onGeneratePurchaseTask,
  onAddStockArticle,
  onUpdateStockArticle,
  onDeleteStockArticle
}: StocksViewProps) {
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [adjustQty, setAdjustQty] = useState(100);
  const [adjustReason, setAdjustReason] = useState('Approvisionnement periodique');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<StockArticle['category']>('other');
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState('kg');
  const [minThreshold, setMinThreshold] = useState(10);

  const handleAdjustSubmit = (articleId: string) => {
    if (adjustQty === 0 || !adjustReason) return;
    onAdjustStock(articleId, adjustQty, adjustReason);
    setActiveArticleId(null);
    setAdjustQty(100);
    setAdjustReason('Approvisionnement periodique');
  };

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onAddStockArticle({ name, category, quantity, unit, minThreshold, locationId: 'main-stock' });
    setName('');
    setShowCreateForm(false);
  };

  return (
    <div id="stocks-view" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            Module Gestion des Stocks & Intrants
          </h2>
          <p className="text-xs text-slate-500">Suivi des aliments, produits veterinaires, engrais, semences et materiels techniques.</p>
        </div>
        {role === 'admin' ? (
          <button type="button" onClick={() => setShowCreateForm((prev) => !prev)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Creer un article
          </button>
        ) : (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            <Lock className="w-3 h-3" /> Lecture seule (proprietaire)
          </span>
        )}
      </div>

      {showCreateForm && role === 'admin' && (
        <form onSubmit={handleCreateArticle} className="bg-white border border-emerald-100 p-5 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-6 gap-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom article" className="border border-slate-200 rounded-2xl p-2.5 text-xs" />
          <select value={category} onChange={(e) => setCategory(e.target.value as StockArticle['category'])} className="border border-slate-200 rounded-2xl p-2.5 text-xs bg-white">
            <option value="feed">Aliment</option>
            <option value="vaccine">Vaccin</option>
            <option value="medicine">Medicament</option>
            <option value="seed">Semence</option>
            <option value="fertilizer">Engrais</option>
            <option value="tool">Outil</option>
            <option value="other">Autre</option>
          </select>
          <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} placeholder="Quantite" className="border border-slate-200 rounded-2xl p-2.5 text-xs" />
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unite" className="border border-slate-200 rounded-2xl p-2.5 text-xs" />
          <input type="number" value={minThreshold} onChange={(e) => setMinThreshold(Number(e.target.value))} placeholder="Seuil mini" className="border border-slate-200 rounded-2xl p-2.5 text-xs" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCreateForm(false)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700">Annuler</button>
            <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:border-emerald-800 hover:bg-emerald-700">Creer</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <Package className="w-4 h-4 text-emerald-600" />
            Niveaux de stocks disponibles ({articles.length} articles)
          </h3>

          {articles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-700">Aucun article de stock enregistre.</p>
              <p className="mt-2 text-xs text-slate-500">Les aliments, intrants, medicaments et semences apparaitront ici des leur creation.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {articles.map((article) => {
                const isLow = article.quantity <= article.minThreshold;
                const progressPct = Math.min((article.quantity / (article.minThreshold * 2.5)) * 100, 100);

                return (
                  <div key={article.id} className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow transition-shadow ${isLow ? 'border-amber-200 bg-amber-50/10' : 'border-slate-100'}`}>
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs">{article.name}</h4>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded tracking-wider inline-block mt-1">{article.category}</span>
                        </div>
                        <span className={`text-sm font-bold ${isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                          {article.quantity} {article.unit}
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progressPct}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                          <span>Min requis : {article.minThreshold} {article.unit}</span>
                          {isLow && (
                            <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3 animate-pulse" />
                              Stock faible
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {role === 'admin' && (
                      <div className="mt-4 pt-3 border-t border-slate-50 flex flex-col gap-2">
                        {activeArticleId === article.id ? (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-2 animate-fade-in">
                            <div className="flex gap-2">
                              <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} className="w-1/2 p-1.5 border border-slate-200 rounded bg-white text-xs" />
                              <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="w-1/2 p-1.5 border border-slate-200 rounded bg-white text-xs" />
                            </div>
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => setActiveArticleId(null)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-3.5 py-2 text-[10px] font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700">Annuler</button>
                              <button onClick={() => handleAdjustSubmit(article.id)} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-3.5 py-2 text-[10px] font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:border-emerald-800 hover:bg-emerald-700">Confirmer</button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <button onClick={() => { setActiveArticleId(article.id); setAdjustQty(100); }} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-[10px] font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700">
                                <RefreshCw className="w-3 h-3" /> Ajuster
                              </button>
                              {isLow && (
                                <button onClick={() => onGeneratePurchaseTask(article)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-amber-700 bg-amber-600 px-4 py-2 text-[10px] font-semibold text-white shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:border-amber-800 hover:bg-amber-700">
                                  <ShoppingBag className="w-3 h-3" /> Commander
                                </button>
                              )}
                            </div>
                            <AdminEntityActions
                              compact
                              onEdit={() => {
                                const nextName = window.prompt('Nom de l\'article', article.name);
                                if (!nextName) return;
                                onUpdateStockArticle(article.id, { name: nextName });
                              }}
                              onDelete={() => {
                                if (window.confirm(`Supprimer l'article ${article.name} ?`)) {
                                  onDeleteStockArticle(article.id);
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

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <History className="w-4 h-4 text-emerald-600" />
            Mouvements recents
          </h3>
          <p className="text-[11px] text-slate-400">Traces logistiques des operations de l'exploitation.</p>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {movements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
                Aucun mouvement de stock enregistre pour le moment.
              </div>
            ) : (
              movements.slice().reverse().map((movement) => {
                const article = articles.find((item) => item.id === movement.articleId);
                return (
                  <div key={movement.id} className="p-3 border-b border-slate-50 text-xs flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-slate-800">{article?.name || 'Article inconnu'}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 italic">{movement.reason}</p>
                      <div className="flex gap-2 text-[9px] text-slate-400 mt-1 uppercase tracking-wide">
                        <span>Ref : {movement.sourceModule || 'Stock'}</span>
                        <span>{movement.date}</span>
                      </div>
                    </div>
                    <span className={`font-bold shrink-0 ${movement.type === 'in' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {movement.type === 'in' ? '+' : '-'}{movement.quantity} {article?.unit}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
