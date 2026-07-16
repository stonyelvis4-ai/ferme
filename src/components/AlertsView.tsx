/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlertTriangle,
  Check,
  Zap,
  Tag,
  Calendar,
  Lock,
  Siren,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Alert, UserRole } from '../types';
import AdminEntityActions from './AdminEntityActions';

interface AlertsViewProps {
  role: UserRole;
  alerts: Alert[];
  hasRingingAlerts: boolean;
  alarmSilenced: boolean;
  alarmPlaybackBlocked: boolean;
  onSilenceAlarm: () => void;
  onResumeAlarm: () => void;
  onDismissAlert: (alertId: string) => void;
  onGenerateCorrectiveTask: (alert: Alert) => void;
  onAddAlert: (alert: Omit<Alert, 'id' | 'date' | 'read'>) => void;
  onUpdateAlert: (alertId: string, updates: Partial<Alert>) => void;
  onDeleteAlert: (alertId: string) => void;
}

export default function AlertsView({
  role,
  alerts,
  hasRingingAlerts,
  alarmSilenced,
  alarmPlaybackBlocked,
  onSilenceAlarm,
  onResumeAlarm,
  onDismissAlert,
  onGenerateCorrectiveTask,
  onAddAlert,
  onUpdateAlert,
  onDeleteAlert
}: AlertsViewProps) {
  const activeAlerts = alerts.filter((a) => !a.read);
  const urgentAlerts = activeAlerts.filter((alert) => alert.severity === 'critical' || alert.severity === 'warning');
  const criticalAlertsCount = activeAlerts.filter((alert) => alert.severity === 'critical').length;
  const warningAlertsCount = activeAlerts.filter((alert) => alert.severity === 'warning').length;

  const handleCreateAlert = () => {
    const title = window.prompt('Titre de l\'alerte');
    if (!title) return;
    const description = window.prompt('Description de l\'alerte', '') ?? '';
    onAddAlert({
      title,
      description,
      severity: 'warning',
      sourceModule: 'General'
    });
  };

  const handleEditAlert = (alert: Alert) => {
    const title = window.prompt('Titre de l\'alerte', alert.title);
    if (!title) return;
    const description = window.prompt('Description de l\'alerte', alert.description) ?? alert.description;
    onUpdateAlert(alert.id, { title, description });
  };

  return (
    <div id="alerts-view" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Module Centre d'Alertes Métier
          </h2>
          <p className="text-xs text-slate-500">
            Détection automatique d'anomalies (rupture de stock, retards de récolte, pics de mortalité ou de pH).
          </p>
        </div>
        {role === 'admin' ? (
          <button
            type="button"
            onClick={handleCreateAlert}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
          >
            <Zap className="w-4 h-4" /> Créer une alerte
          </button>
        ) : (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            <Lock className="w-3 h-3" /> Lecture Seule (Propriétaire)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Alertes ouvertes</span>
          <span className="mt-2 block text-2xl font-bold text-slate-900">{activeAlerts.length}</span>
          <p className="mt-1 text-xs text-slate-500">Anomalies encore visibles dans le centre d'alertes.</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-700">Critiques</span>
          <span className="mt-2 block text-2xl font-bold text-rose-900">{criticalAlertsCount}</span>
          <p className="mt-1 text-xs text-rose-800">Demandent une action immédiate ou un contrôle rapproché.</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Importantes</span>
          <span className="mt-2 block text-2xl font-bold text-amber-900">{warningAlertsCount}</span>
          <p className="mt-1 text-xs text-amber-800">À transformer au besoin en tâche corrective.</p>
        </div>
      </div>

      {hasRingingAlerts && (
        <div className={`overflow-hidden rounded-3xl border p-5 shadow-sm ${
          alarmSilenced || alarmPlaybackBlocked
            ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-white'
            : 'border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50'
        }`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`rounded-2xl p-2 ${
                  alarmSilenced || alarmPlaybackBlocked ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  <Siren className={`h-5 w-5 ${alarmSilenced || alarmPlaybackBlocked ? '' : 'animate-pulse'}`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {alarmSilenced
                      ? 'Alarme mise en sourdine'
                      : alarmPlaybackBlocked
                        ? 'Activation manuelle requise'
                        : 'Alarme active en boucle'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {criticalAlertsCount} critique(s), {warningAlertsCount} importante(s), {urgentAlerts.length} alerte(s) à traiter.
                  </p>
                </div>
              </div>
              <p className="max-w-3xl text-xs leading-6 text-slate-600">
                {alarmPlaybackBlocked
                  ? "Le navigateur a bloqué la lecture automatique. Activez l'alarme pour lancer le son en boucle."
                  : alarmSilenced
                    ? "Le son a été coupé, mais les alertes prioritaires restent ouvertes tant qu'elles ne sont pas ignorées ou corrigées."
                    : "Le son d'alarme tourne tant qu'une alerte importante ou critique reste non lue dans la plateforme."}
              </p>
            </div>

            <div className="flex w-full gap-2 md:w-auto">
              <button
                type="button"
                onClick={alarmSilenced || alarmPlaybackBlocked ? onResumeAlarm : onSilenceAlarm}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-sm transition md:flex-none ${
                  alarmSilenced || alarmPlaybackBlocked
                    ? 'border border-emerald-700 bg-emerald-600 text-white hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700'
                    : 'border border-rose-700 bg-rose-600 text-white hover:-translate-y-0.5 hover:border-rose-800 hover:bg-rose-700'
                }`}
              >
                {alarmSilenced || alarmPlaybackBlocked ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {alarmSilenced ? 'Relancer l’alarme' : alarmPlaybackBlocked ? 'Activer l’alarme' : 'Couper l’alarme'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Alerts */}
      <div className="space-y-4">
        {activeAlerts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
            Excellente nouvelle : aucune anomalie détectée sur l'exploitation.
          </div>
        ) : (
          activeAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border transition-colors relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                  isCritical
                    ? 'bg-rose-50 border-rose-100 text-rose-900'
                    : isWarning
                    ? 'bg-amber-50 border-amber-100 text-amber-900'
                    : 'bg-blue-50 border-blue-100 text-blue-900'
                }`}
              >
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-xs md:text-sm">
                    <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-rose-600' : 'bg-amber-500'}`}></span>
                    {alert.title}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    {alert.description}
                  </p>
                  <div className="flex gap-4 text-[10px] text-slate-400 mt-2 uppercase tracking-wider font-semibold">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-slate-400" /> Source : {alert.sourceModule || 'Général'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> Émise le : {new Date(alert.date).toLocaleDateString('fr-FR')} à {new Date(alert.date).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>

                {/* Quick remediation buttons */}
                {role === 'admin' && (
                  <div className="flex gap-2 shrink-0 w-full md:w-auto">
                    <button
                      onClick={() => onDismissAlert(alert.id)}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-1 rounded-2xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Ignorer
                    </button>
                    <button
                      onClick={() => onGenerateCorrectiveTask(alert)}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
                    >
                      <Zap className="w-3.5 h-3.5" /> Corriger
                    </button>
                    <AdminEntityActions
                      compact
                      onEdit={() => handleEditAlert(alert)}
                      onDelete={() => {
                        if (window.confirm(`Supprimer l'alerte ${alert.title} ?`)) {
                          onDeleteAlert(alert.id);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


