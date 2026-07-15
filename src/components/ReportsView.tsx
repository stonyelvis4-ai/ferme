/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Filter,
  Download,
  FileSpreadsheet,
  Layers,
  Lock
} from 'lucide-react';
import { UserRole } from '../types';

interface ReportsViewProps {
  role: UserRole;
}

export default function ReportsView({ role }: ReportsViewProps) {
  const [period, setPeriod] = useState('month');
  const [reportType, setReportType] = useState('global');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExport = (format: 'PDF' | 'EXCEL' | 'CSV') => {
    setIsExporting(format);
    setTimeout(() => {
      setIsExporting(null);
      alert(`Exportation réussie ! Le fichier FermePlus_Rapport_${reportType}_${period}.${format.toLowerCase()} a été téléchargé avec succès.`);
    }, 1500);
  };

  return (
    <div id="rapports-view" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Module Rapports & Décisions Analytiques
          </h2>
          <p className="text-xs text-slate-500">
            Générez des rapports consolidés de production, financiers et sanitaires pour la gestion de votre ferme.
          </p>
        </div>
      </div>

      {/* Main Grid: Filters & Export */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Filter Selection Panel */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-emerald-600" />
            Critères d'Analyse du Rapport
          </h3>

          {/* Time range */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Périodicité</label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPeriod('week')}
                className={`py-2 px-1 rounded-full border text-center transition-all shadow-sm hover:-translate-y-0.5 ${
                  period === 'week' ? 'bg-emerald-600 border-emerald-600 text-white font-bold' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                Hebdomadaire
              </button>
              <button
                type="button"
                onClick={() => setPeriod('month')}
                className={`py-2 px-1 rounded-full border text-center transition-all shadow-sm hover:-translate-y-0.5 ${
                  period === 'month' ? 'bg-emerald-600 border-emerald-600 text-white font-bold' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setPeriod('year')}
                className={`py-2 px-1 rounded-full border text-center transition-all shadow-sm hover:-translate-y-0.5 ${
                  period === 'year' ? 'bg-emerald-600 border-emerald-600 text-white font-bold' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                Annuel
              </button>
            </div>
          </div>

          {/* Report types */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type de Synthèse</label>
            <select
              id="report-type-select"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-2xl focus:outline-none bg-white text-slate-700 shadow-sm"
            >
              <option value="global">Consolidé de l'Exploitation (Global)</option>
              <option value="finances">Finances : Compte de Résultat Simplifié</option>
              <option value="livestock">Élevage : Performance des Lots de chair</option>
              <option value="eggs">Pondeuses : Suivi de ponte & Casse</option>
              <option value="fish">Pisciculture : Croissance & pH de bacs</option>
              <option value="stocks">Logistique : Mouvements des intrants</option>
              <option value="sanitary">Sanitaire : Couverture vaccinale</option>
            </select>
          </div>

          {/* Connected parameters warning */}
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-[11px] text-slate-500 leading-normal shadow-sm">
            â„¹ï¸ Le rapport extrait les données consolidées en temps réel des modules. Tout nouvel enregistrement y est instantanément inclus.
          </div>
        </div>

        {/* Export Formats Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Génération & Téléchargements</h3>
            <p className="text-xs text-slate-500 mt-0.5">Choisissez le format d'export de votre choix.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Excel Download block */}
            <div
              onClick={() => !isExporting && handleExport('EXCEL')}
              className={`p-4 rounded-3xl border border-slate-100 hover:border-emerald-500/40 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer text-center space-y-3 flex flex-col items-center justify-center shadow-sm hover:shadow-md ${
                isExporting ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Format Microsoft Excel</h4>
                <p className="text-[10px] text-slate-400 mt-1">Idéal pour le calcul de formules et tableurs de tri.</p>
              </div>
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-full flex items-center gap-1 mt-1 shadow-sm">
                <Download className="w-3 h-3" /> EXPORT .XLSX
              </span>
            </div>

            {/* PDF Download block */}
            <div
              onClick={() => !isExporting && handleExport('PDF')}
              className={`p-4 rounded-3xl border border-slate-100 hover:border-rose-500/40 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer text-center space-y-3 flex flex-col items-center justify-center shadow-sm hover:shadow-md ${
                isExporting ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <div className="bg-rose-50 text-rose-600 p-3 rounded-full">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Document PDF Imprimable</h4>
                <p className="text-[10px] text-slate-400 mt-1">Parfait pour partager aux partenaires ou imprimer au hangar.</p>
              </div>
              <span className="text-[10px] bg-rose-600 text-white font-bold px-2.5 py-1 rounded-full flex items-center gap-1 mt-1 shadow-sm">
                <Download className="w-3 h-3" /> EXPORT .PDF
              </span>
            </div>

            {/* CSV Download block */}
            <div
              onClick={() => !isExporting && handleExport('CSV')}
              className={`p-4 rounded-3xl border border-slate-100 hover:border-slate-500/40 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer text-center space-y-3 flex flex-col items-center justify-center shadow-sm hover:shadow-md ${
                isExporting ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <div className="bg-slate-100 text-slate-600 p-3 rounded-full">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Format CSV (Données brutes)</h4>
                <p className="text-[10px] text-slate-400 mt-1">Format texte léger séparé par virgule pour d'autres ERPs.</p>
              </div>
              <span className="text-[10px] bg-slate-700 text-white font-bold px-2.5 py-1 rounded-full flex items-center gap-1 mt-1 shadow-sm">
                <Download className="w-3 h-3" /> EXPORT .CSV
              </span>
            </div>
          </div>

          {isExporting && (
            <div className="p-3 bg-slate-50 border border-slate-200 text-center rounded-2xl text-xs text-slate-500 flex items-center justify-center gap-2 animate-pulse shadow-sm">
              <span>🔄 Compilation analytique des données de l'exploitation pour le format {isExporting}...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}


