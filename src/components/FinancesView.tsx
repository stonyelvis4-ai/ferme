/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Lock,
  Plus
} from 'lucide-react';
import { FinanceTransaction, UserRole } from '../types';
import AdminEntityActions from './AdminEntityActions';

interface FinancesViewProps {
  role: UserRole;
  transactions: FinanceTransaction[];
  currency: string;
  onAddManualTransaction: (tx: Omit<FinanceTransaction, 'id' | 'sourceModule'>) => void;
  onUpdateTransaction: (transactionId: string, updates: Partial<FinanceTransaction>) => void;
  onDeleteTransaction: (transactionId: string) => void;
}

export default function FinancesView({
  role,
  transactions,
  currency,
  onAddManualTransaction,
  onUpdateTransaction,
  onDeleteTransaction
}: FinancesViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Alimentation');
  const [amount, setAmount] = useState(50000);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description) return;

    onAddManualTransaction({
      type,
      category,
      amount,
      description,
      date
    });

    // Reset
    setDescription('');
    setShowAddForm(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      maximumFractionDigits: 0
    }).format(val) + ' ' + currency;
  };

  // Aggregates
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const profit = income - expenses;
  const marginPct = income > 0 ? ((profit / income) * 100).toFixed(1) : "0";

  const handleEditTransaction = (tx: FinanceTransaction) => {
    const descriptionValue = window.prompt('Description de l\'écriture', tx.description);
    if (!descriptionValue) return;
    const amountValue = window.prompt('Montant', String(tx.amount));
    if (!amountValue) return;
    const nextAmount = Number(amountValue);
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) return;
    onUpdateTransaction(tx.id, {
      description: descriptionValue,
      amount: nextAmount
    });
  };

  return (
    <div id="finances-view" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Module Finances & Trésorerie
          </h2>
          <p className="text-xs text-slate-500">
            Comptabilité simplifiée, relevé d'exploitation et calcul de marge opérationnelle en continu.
          </p>
        </div>
        {role === 'admin' ? (
          <button
            id="btn-add-expense"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" /> Enregistrer un flux manuel
          </button>
        ) : (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            <Lock className="w-3 h-3" /> Lecture Seule (Propriétaire)
          </span>
        )}
      </div>

      {/* Margins scoreboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Revenus Cumulés</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-800 font-mono">{formatCurrency(income)}</h3>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center">
              <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> +100%
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Charges Directes</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-800 font-mono">{formatCurrency(expenses)}</h3>
            <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center">
              <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> Engagé
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Résultat Financier</span>
          <div className="mt-2.5">
            <h3 className={`text-2xl font-bold font-mono ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(profit)}
            </h3>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Taux de Marge</span>
          <div className="mt-2.5">
            <h3 className="text-2xl font-bold text-slate-800 font-mono">{marginPct}%</h3>
          </div>
        </div>
      </div>

      {/* Manual Transaction Input Form */}
      {showAddForm && role === 'admin' && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-emerald-100 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in"
        >
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2">
            Enregistrer une dépense ou un revenu divers
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Flux</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{type === 'income' ? 'Entrée de trésorerie' : 'Sortie de trésorerie'}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Catégorie: {category}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Montant</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{formatCurrency(amount)}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Date comptable: {date}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Libellé</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-900">{description || 'Motif en attente'}</span>
              <p className="mt-1 text-[11px] text-emerald-800">Cette écriture sera tracée dans les rapports.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Type de flux *</label>
              <select
                id="tx-type-select"
                value={type}
                onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              >
                <option value="expense">Dépense / Débit</option>
                <option value="income">Revenu / Crédit</option>
              </select>
              <p className="mt-1 text-[10px] text-slate-500">Entrée ou sortie d'argent.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Catégorie *</label>
              <select
                id="tx-cat-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              >
                <option value="Alimentation">Alimentation</option>
                <option value="Sanitaire">Sanitaire / Véto</option>
                <option value="Salarial">Salaires & Main d'œuvre</option>
                <option value="Infrastructure">Infrastructure / Bâtiment</option>
                <option value="Vente Animaux">Vente de bétail / Poissons</option>
                <option value="Vente Oeufs">Vente d'œufs</option>
                <option value="Autre">Divers / Autre</option>
              </select>
              <p className="mt-1 text-[10px] text-slate-500">Classement comptable.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Montant ({currency}) *</label>
              <input
                id="tx-amount-input"
                type="number"
                required
                min={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder={`Ex. 50000 ${currency}`}
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-1 text-[10px] text-slate-500">Montant total payé ou reçu.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
              <input
                id="tx-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-1 text-[10px] text-slate-500">Date de l'opération.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Désignation / Motif *</label>
              <input
                id="tx-desc-input"
                type="text"
                required
                placeholder="Ex: Achat carburant groupe"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-1 text-[10px] text-slate-500">Libellé lisible dans la comptabilité.</p>
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-50 p-2.5 border border-slate-100 rounded-2xl">
            <span className="text-[10px] text-slate-500">
              Les transactions manuelles restent historisées sous l'origine "Finances".
            </span>
            <div className="flex gap-1.5">
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
                Enregistrer la transaction
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Transactions Ledger Ledger Book */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 font-sans tracking-tight text-sm">
            Grand Livre des Mouvements Comptables
          </h3>
          <span className="text-xs text-slate-400">Enregistrements consolidés en temps réel</span>
        </div>

        <div className="overflow-x-auto">
          {transactions.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-slate-700">Aucun mouvement financier enregistré.</p>
              <p className="mt-2 text-xs text-slate-500">
                Les ventes, dépenses et ajustements comptables de la ferme apparaîtront ici automatiquement.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Flux</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Catégorie</th>
                  <th className="p-4">Module Source</th>
                <th className="p-4 text-right">Montant</th>
                {role === 'admin' && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {transactions.slice().reverse().map((tx) => {
                  const isIncome = tx.type === 'income';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <span className={`p-1.5 rounded-2xl flex items-center justify-center w-8 h-8 ${
                          isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                        }`}>
                          {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {tx.date}
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{tx.description}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">
                          {tx.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wide">
                          {tx.sourceModule}
                        </span>
                      </td>
                    <td className={`p-4 text-right font-mono font-bold ${
                      isIncome ? 'text-emerald-600' : 'text-slate-800'
                    }`}>
                      {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    {role === 'admin' && (
                      <td className="p-4 text-right">
                        <AdminEntityActions
                          compact
                          onEdit={() => handleEditTransaction(tx)}
                          onDelete={() => {
                            if (window.confirm(`Supprimer l'écriture "${tx.description}" ?`)) {
                              onDeleteTransaction(tx.id);
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

