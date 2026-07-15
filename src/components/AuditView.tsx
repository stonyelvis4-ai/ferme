/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldAlert,
  Smartphone,
  Laptop,
  CheckCircle2,
  CloudLightning,
  Clock,
  Wifi
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditViewProps {
  auditLogs: AuditLog[];
}

export default function AuditView({ auditLogs }: AuditViewProps) {
  return (
    <div id="audit-view" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
            Module Journal d'Audit & Sécurité
          </h2>
          <p className="text-xs text-slate-500">
            Traçabilité inaltérable des actions administrateurs et propriétaires, gestion des rôles et états de synchronisation.
          </p>
        </div>
        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 font-bold px-2.5 py-1.5 rounded-full shadow-sm flex items-center gap-1">
          <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          Moteur d'Audit Actif
        </span>
      </div>

      {/* Audit Log list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 font-sans tracking-tight text-sm">
            Historique Chronologique de Sécurité
          </h3>
          <span className="text-xs text-slate-400">Enregistré automatiquement</span>
        </div>

        <div className="overflow-x-auto">
          {auditLogs.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-slate-700">Aucune trace d'audit disponible.</p>
              <p className="mt-2 text-xs text-slate-500">
                Les connexions, modifications et actions métier sécurisées seront historisées ici automatiquement.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Utilisateur</th>
                  <th className="p-4">Module</th>
                  <th className="p-4">Action Réalisée</th>
                  <th className="p-4">Valeur Nouvelle</th>
                  <th className="p-4">Date & Heure</th>
                  <th className="p-4 text-center">Appareil</th>
                  <th className="p-4 text-right">Synchronisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.slice().reverse().map((log) => {
                  const isPhone = log.device.toLowerCase().includes('phone') || log.device.toLowerCase().includes('mobile') || log.device.toLowerCase().includes('app');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                          log.user === 'Admin' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {log.user}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-400 uppercase text-[10px]">
                        {log.module}
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{log.action}</td>
                      <td className="p-4 text-slate-600 max-w-[200px] truncate" title={log.newValue}>
                        {log.newValue || '-'}
                      </td>
                      <td className="p-4 font-medium text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-300" />
                          {new Date(log.timestamp).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-500 text-[10px]">
                          {isPhone ? <Smartphone className="w-3.5 h-3.5 text-slate-400" /> : <Laptop className="w-3.5 h-3.5 text-slate-400" />}
                          {log.device}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`inline-flex items-center gap-1 font-bold text-[10px] uppercase ${
                          log.syncStatus === 'synced' ? 'text-emerald-600' :
                          log.syncStatus === 'pending' ? 'text-amber-500' :
                          'text-rose-500'
                        }`}>
                          {log.syncStatus === 'synced' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Synchronisé
                            </>
                          ) : log.syncStatus === 'pending' ? (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              En attente
                            </>
                          ) : (
                            <>
                              <CloudLightning className="w-3.5 h-3.5" />
                              Erreur / Conflit
                            </>
                          )}
                        </span>
                      </td>
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

