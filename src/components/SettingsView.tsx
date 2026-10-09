/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  Save,
  Paperclip,
  Upload,
  Lock,
  Building,
  KeyRound,
  Siren,
  UserPlus,
  Users,
  Eye,
  EyeOff,
  BellRing,
  LayoutDashboard,
  UserRound,
  Volume2
} from 'lucide-react';
import { FarmSettings, UserRole } from '../types';
import { AuthUser, UserPreferences } from '../services/fermApi';

type EditablePreferences = Required<Pick<
  UserPreferences,
  'sound_alerts' | 'warning_alerts' | 'critical_alerts' | 'alert_volume' | 'default_view'
>>;

interface SettingsViewProps {
  role: UserRole;
  settings: FarmSettings;
  currentUser: AuthUser | null;
  owners: AuthUser[];
  onUpdateSettings: (newSettings: FarmSettings) => void;
  onTestAlarm: (options: {
    soundEnabled: boolean;
    loopEnabled: boolean;
    volume: number;
    soundKey: string;
  }) => void;
  onChangePassword: (payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) => void;
  onUpdatePersonalSettings: (payload: {
    name: string;
    email: string;
    preferences: EditablePreferences;
  }) => Promise<void>;
  onCreateOwner: (payload: {
    name: string;
    email: string;
    password: string;
  }) => void;
}

export default function SettingsView({
  role,
  settings,
  currentUser,
  owners,
  onUpdateSettings,
  onTestAlarm,
  onChangePassword,
  onUpdatePersonalSettings,
  onCreateOwner
}: SettingsViewProps) {
  const currencyOptions = [
    { value: 'FCFA', label: 'Franc CFA (FCFA)', hint: 'Adapté à la comptabilité locale ouest-africaine.' },
    { value: 'EUR', label: 'Euro (EUR)', hint: 'Utile si vos achats ou ventes sont en zone euro.' },
    { value: 'USD', label: 'Dollar US (USD)', hint: 'Pratique pour les fournisseurs ou partenaires internationaux.' }
  ];
  const [name, setName] = useState(settings.name);
  const [location, setLocation] = useState(settings.location);
  const [managerName, setManagerName] = useState(settings.managerName);
  const [contactEmail, setContactEmail] = useState(settings.contactEmail);
  const [contactPhone, setContactPhone] = useState(settings.contactPhone);
  const [currency, setCurrency] = useState(settings.currency);
  const [alarmSoundEnabled, setAlarmSoundEnabled] = useState(settings.alarmSoundEnabled ?? true);
  const [alarmLoopEnabled, setAlarmLoopEnabled] = useState(settings.alarmLoopEnabled ?? true);
  const [alarmForWarnings, setAlarmForWarnings] = useState(settings.alarmForWarnings ?? true);
  const [alarmForCriticals, setAlarmForCriticals] = useState(settings.alarmForCriticals ?? true);
  const [alarmVolume, setAlarmVolume] = useState(settings.alarmVolume ?? 100);
  const [alarmSoundKey, setAlarmSoundKey] = useState(settings.alarmSoundKey ?? 'ferm-plus-default');
  const initialPreferences = currentUser?.preferences;
  const [profileName, setProfileName] = useState(currentUser?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email ?? '');
  const [personalSoundEnabled, setPersonalSoundEnabled] = useState(initialPreferences?.sound_alerts ?? true);
  const [personalWarningAlerts, setPersonalWarningAlerts] = useState(initialPreferences?.warning_alerts ?? true);
  const [personalCriticalAlerts, setPersonalCriticalAlerts] = useState(initialPreferences?.critical_alerts ?? true);
  const [personalAlertVolume, setPersonalAlertVolume] = useState(initialPreferences?.alert_volume ?? 100);
  const [defaultView, setDefaultView] = useState<EditablePreferences['default_view']>(initialPreferences?.default_view ?? 'dashboard');
  const [personalSaving, setPersonalSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [showAdminPasswords, setShowAdminPasswords] = useState(false);

  const [files, setFiles] = useState<{ name: string; size: string; date: string }[]>([]);

  const [newFileName, setNewFileName] = useState('');
  const selectedCurrencyOption = currencyOptions.find((option) => option.value === currency) ?? currencyOptions[0];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'owner') return;

    onUpdateSettings({
      ...settings,
      name,
      location,
      managerName,
      contactEmail,
      contactPhone,
      currency,
      alarmSoundEnabled,
      alarmLoopEnabled,
      alarmForWarnings,
      alarmForCriticals,
      alarmVolume,
      alarmSoundKey
    });

  };

  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName) return;

    setFiles([
      ...files,
      {
        name: newFileName.toLowerCase().endsWith('.pdf') || newFileName.toLowerCase().endsWith('.jpg') ? newFileName : `${newFileName}.pdf`,
        size: "340 KB",
        date: new Date().toISOString().split('T')[0]
      }
    ]);

    setNewFileName('');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChangePassword({
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: confirmPassword,
    });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handlePersonalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) return;

    setPersonalSaving(true);
    try {
      await onUpdatePersonalSettings({
        name: profileName.trim(),
        email: profileEmail.trim(),
        preferences: {
          sound_alerts: personalSoundEnabled,
          warning_alerts: personalWarningAlerts,
          critical_alerts: personalCriticalAlerts,
          alert_volume: personalAlertVolume,
          default_view: defaultView,
        },
      });
    } finally {
      setPersonalSaving(false);
    }
  };

  const handleOwnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'admin') return;

    onCreateOwner({
      name: ownerName,
      email: ownerEmail,
      password: ownerPassword,
    });

    setOwnerName('');
    setOwnerEmail('');
    setOwnerPassword('');
  };

  return (
    <div id="settings-view" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            {role === 'admin' ? "Paramètres de l'exploitation et mon compte" : 'Mon compte'}
          </h2>
          <p className="text-xs text-slate-500">
            {role === 'admin'
              ? 'Réglez d’abord votre expérience personnelle, puis les paramètres partagés de la ferme.'
              : 'Personnalisez votre compte sans modifier les réglages communs de la ferme.'}
          </p>
        </div>
      </div>

      <form onSubmit={handlePersonalSave} className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-white px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <UserRound className="h-4 w-4 text-emerald-600" /> Mon profil et mes préférences
            </h3>
            <p className="mt-1 text-xs text-slate-500">Ces choix sont associés à votre compte et n’affectent pas les autres utilisateurs.</p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
            Personnel
          </span>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <section className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-800">Identité de connexion</h4>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Votre nom est affiché dans l’application. Votre adresse sert uniquement à votre accès personnel.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <label className="block text-xs font-semibold text-slate-600">
                Nom affiché
                <input
                  required
                  maxLength={255}
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="Votre nom"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Email de connexion
                <input
                  required
                  type="email"
                  maxLength={255}
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="vous@exemple.com"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5"><LayoutDashboard className="h-3.5 w-3.5 text-emerald-600" /> Écran à l’ouverture</span>
              <select
                value={defaultView}
                onChange={(e) => setDefaultView(e.target.value as EditablePreferences['default_view'])}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              >
                <option value="dashboard">Tableau de bord</option>
                <option value="agenda">Agenda / échéances</option>
                <option value="tasks">Tâches / travaux</option>
                <option value="alerts">Alertes</option>
              </select>
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><BellRing className="h-4 w-4" /></span>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Alertes de mon poste</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Vous choisissez ce que vous entendez. Les règles d’alerte de la ferme restent inchangées.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <input type="checkbox" checked={personalSoundEnabled} onChange={(e) => setPersonalSoundEnabled(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span><span className="block font-semibold text-slate-700">Son activé</span><span className="mt-0.5 block text-[10px] text-slate-500">Coupe uniquement le son sur votre appareil.</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <input type="checkbox" checked={personalWarningAlerts} disabled={!personalSoundEnabled} onChange={(e) => setPersonalWarningAlerts(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed" />
                <span><span className="block font-semibold text-slate-700">Alertes importantes</span><span className="mt-0.5 block text-[10px] text-slate-500">Pour les avertissements terrain.</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs sm:col-span-2">
                <input type="checkbox" checked={personalCriticalAlerts} disabled={!personalSoundEnabled} onChange={(e) => setPersonalCriticalAlerts(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed" />
                <span><span className="block font-semibold text-slate-700">Alertes critiques</span><span className="mt-0.5 block text-[10px] text-slate-500">Recommandé pour les incidents urgents.</span></span>
              </label>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5"><Volume2 className="h-3.5 w-3.5 text-emerald-600" /> Volume personnel</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{personalAlertVolume}%</span>
              </div>
              <input type="range" min="0" max="100" step="1" value={personalAlertVolume} disabled={!personalSoundEnabled} onChange={(e) => setPersonalAlertVolume(Number(e.target.value))} className="mt-3 w-full accent-emerald-600 disabled:cursor-not-allowed" />
              <p className="mt-1 text-[10px] text-slate-500">Le volume reste limité par le seuil défini pour l’exploitation.</p>
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          <button type="submit" disabled={personalSaving} className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70">
            <Save className="h-3.5 w-3.5" /> {personalSaving ? 'Enregistrement…' : 'Enregistrer mes préférences'}
          </button>
        </div>
      </form>

      {role === 'owner' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
            <KeyRound className="h-4 w-4 text-emerald-600" /> Changement de mot de passe
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-slate-600">Mot de passe actuel
              <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900" />
            </label>
            <label className="block text-xs font-semibold text-slate-600">Nouveau mot de passe
              <input type="password" required minLength={12} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900" />
            </label>
            <label className="block text-xs font-semibold text-slate-600">Confirmation
              <input type="password" required minLength={12} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-900" />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white">
              <KeyRound className="h-4 w-4" /> Mettre à jour le mot de passe
            </button>
          </div>
        </form>
      )}

      {/* Farm Settings Form */}
      <div className="grid grid-cols-1 gap-6" hidden={role === 'owner'}>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-emerald-600" />
            Informations Générales de la Ferme
          </h3>

          <form onSubmit={handleSave} className="space-y-4 text-xs text-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Identité ferme</span>
                <span className="mt-1 block text-sm font-semibold text-emerald-900">{name || 'Nom à renseigner'}</span>
                <p className="mt-1 text-[11px] text-emerald-800">Localisation: {location || 'non renseignée'}</p>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Responsable</span>
                <span className="mt-1 block text-sm font-semibold text-emerald-900">{managerName || 'Administrateur à préciser'}</span>
                <p className="mt-1 text-[11px] text-emerald-800">Téléphone: {contactPhone || 'non renseigné'}</p>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Paramètre financier</span>
                <span className="mt-1 block text-sm font-semibold text-emerald-900">{selectedCurrencyOption.label}</span>
                <p className="mt-1 text-[11px] text-emerald-800">{selectedCurrencyOption.hint}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Raison Sociale de la Ferme *</label>
                <input
                  id="settings-name-input"
                  type="text"
                  required
                  disabled={role === 'owner'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Ferme Saint-Elvis"
                  className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-[10px] text-slate-500">Nom officiel affiché dans l'application.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Localisation géographique *</label>
                <input
                  id="settings-loc-input"
                  type="text"
                  required
                  disabled={role === 'owner'}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex. Abidjan, Anyama"
                  className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-[10px] text-slate-500">Ville, village ou zone d'exploitation.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Nom de l'Administrateur *</label>
                <input
                  id="settings-manager-input"
                  type="text"
                  required
                  disabled={role === 'owner'}
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Ex. Elvis Admin"
                  className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-[10px] text-slate-500">Responsable principal du compte.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Téléphone de contact *</label>
                <input
                  id="settings-phone-input"
                  type="text"
                  required
                  disabled={role === 'owner'}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Ex. +225 07 00 00 00 00"
                  className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-[10px] text-slate-500">Numéro utilisé sur les contacts ferme.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Email de contact *</label>
                <input
                  id="settings-email-input"
                  type="email"
                  required
                  disabled={role === 'owner'}
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Ex. contact@ferme.ci"
                  className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-[10px] text-slate-500">Adresse de contact officielle.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Devise monétaire de transaction *</label>
                <select
                  id="settings-currency-select"
                  value={currency}
                  disabled={role === 'owner'}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
                >
                  {currencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-500">{selectedCurrencyOption.hint}</p>
              </div>
            </div>

            {role === 'admin' ? (
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
                >
                  <Save className="w-4 h-4" /> Enregistrer les Paramètres
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-2 text-slate-500 text-[11px] shadow-sm">
                <Lock className="w-3.5 h-3.5" />
                <span>Les propriétaires rattachés possèdent uniquement un droit de consultation en lecture seule sur les réglages structurels.</span>
              </div>
            )}
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Siren className="w-4 h-4 text-emerald-600" />
              Paramètres de l'alarme sonore
            </h3>
            <p className="text-xs text-slate-500">
              Réglez ici le comportement de l'alarme qui accompagne les alertes importantes de la plateforme.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <input
                  type="checkbox"
                  checked={alarmSoundEnabled}
                  disabled={role === 'owner'}
                  onChange={(e) => setAlarmSoundEnabled(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                />
                <span className="space-y-1">
                  <span className="block font-semibold text-slate-700">Activer l'alarme sonore</span>
                  <span className="block text-slate-500">Lance un son dès qu'une alerte prioritaire est encore non lue.</span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <input
                  type="checkbox"
                  checked={alarmLoopEnabled}
                  disabled={role === 'owner' || !alarmSoundEnabled}
                  onChange={(e) => setAlarmLoopEnabled(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                />
                <span className="space-y-1">
                  <span className="block font-semibold text-slate-700">Jouer le son en boucle</span>
                  <span className="block text-slate-500">L'alarme continue tant que l'alerte n'est pas traitée ou mise en sourdine.</span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <input
                  type="checkbox"
                  checked={alarmForWarnings}
                  disabled={role === 'owner' || !alarmSoundEnabled}
                  onChange={(e) => setAlarmForWarnings(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                />
                <span className="space-y-1">
                  <span className="block font-semibold text-slate-700">Sonoriser les alertes importantes</span>
                  <span className="block text-slate-500">Déclenche l'alarme sur les alertes de niveau avertissement.</span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <input
                  type="checkbox"
                  checked={alarmForCriticals}
                  disabled={role === 'owner' || !alarmSoundEnabled}
                  onChange={(e) => setAlarmForCriticals(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                />
                <span className="space-y-1">
                  <span className="block font-semibold text-slate-700">Sonoriser les alertes critiques</span>
                  <span className="block text-slate-500">Réserve l'alarme aux incidents les plus sensibles quand nécessaire.</span>
                </span>
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-4">
                <label className="block font-semibold text-slate-700 mb-1">Son de l'alarme</label>
                <p className="text-[11px] text-slate-500 mb-2">Choisissez le son utilisé pour les alertes sonores.</p>
                <select
                  value={alarmSoundKey}
                  disabled={role === 'owner' || !alarmSoundEnabled}
                  onChange={(e) => setAlarmSoundKey(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl p-2.5 bg-white text-xs focus:outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
                >
                  <option value="ferm-plus-default">FERM+ Alarme principale</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Volume de l'alarme</label>
                  <p className="text-[11px] text-slate-500">Ajustez le niveau sonore global de l'alarme.</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                  {alarmVolume}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={alarmVolume}
                disabled={role === 'owner' || !alarmSoundEnabled}
                onChange={(e) => setAlarmVolume(Number(e.target.value))}
                className="mt-4 w-full accent-emerald-600 disabled:cursor-not-allowed"
              />

              {role === 'admin' && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={!alarmSoundEnabled}
                    onClick={() =>
                      onTestAlarm({
                        soundEnabled: alarmSoundEnabled,
                        loopEnabled: alarmLoopEnabled,
                        volume: alarmVolume,
                        soundKey: alarmSoundKey
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                  >
                    <Siren className="w-3.5 h-3.5" /> Tester l'alarme
                  </button>
                </div>
              )}
            </div>
          </div>

          {role === 'admin' && (
            <div className="mt-8 border-t border-slate-100 pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Comptes proprietaires rattaches
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Creez ici les comptes proprietaires qui auront un acces en lecture seule sur cette ferme.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {owners.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                      Aucun proprietaire n est encore rattache a cette ferme.
                    </div>
                  ) : (
                    owners.map((owner) => (
                      <div key={String(owner.id)} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
                        <div className="font-semibold text-slate-800">{owner.name}</div>
                        <div className="text-slate-500">{owner.email}</div>
                        <div className="mt-1 text-[11px] text-emerald-700">
                          {owner.is_active === false ? 'Compte inactif' : 'Compte actif'}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleOwnerSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-900">
                    Le proprietaire aura un acces en lecture seule sur cette ferme uniquement.
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Nom du proprietaire</label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Ex. Jean Propriétaire"
                      className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">Nom affiche dans la liste des comptes rattaches.</p>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Email du proprietaire</label>
                    <input
                      type="email"
                      required
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="Ex. proprietaire@ferme.ci"
                      className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">Cette adresse servira a la connexion du proprietaire.</p>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Mot de passe initial</label>
                    <div className="relative">
                      <input
                        type={showOwnerPassword ? 'text' : 'password'}
                        required
                        minLength={12}
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        placeholder="12 caracteres minimum"
                        className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOwnerPassword((previous) => !previous)}
                        aria-label={showOwnerPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        className="absolute inset-y-0 right-3 inline-flex items-center justify-center text-slate-400 transition hover:text-emerald-600"
                      >
                        {showOwnerPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">12 caracteres minimum avec majuscule, minuscule, chiffre et symbole.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
                    >
                      <UserPlus className="w-4 h-4" /> Creer un proprietaire
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="mt-8 border-t border-slate-100 pt-6 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                Changement de mot de passe
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Mot de passe actuel</label>
                  <div className="relative">
                    <input
                      type={showAdminPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 pr-12 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                      placeholder="********"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPasswords((previous) => !previous)}
                      aria-label={showAdminPasswords ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
                      className="absolute inset-y-0 right-3 inline-flex items-center justify-center text-slate-400 transition hover:text-emerald-600"
                    >
                      {showAdminPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">Mot de passe utilisé actuellement.</p>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showAdminPasswords ? 'text' : 'password'}
                      minLength={12}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                      placeholder="********"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPasswords((previous) => !previous)}
                      aria-label={showAdminPasswords ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
                      className="absolute inset-y-0 right-3 inline-flex items-center justify-center text-slate-400 transition hover:text-emerald-600"
                    >
                      {showAdminPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">12 caracteres minimum avec majuscule, minuscule, chiffre et symbole.</p>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Confirmation</label>
                  <div className="relative">
                    <input
                      type={showAdminPasswords ? 'text' : 'password'}
                      minLength={12}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                      placeholder="********"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPasswords((previous) => !previous)}
                      aria-label={showAdminPasswords ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
                      className="absolute inset-y-0 right-3 inline-flex items-center justify-center text-slate-400 transition hover:text-emerald-600"
                    >
                      {showAdminPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">Doit être identique au nouveau mot de passe.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
                >
                  <KeyRound className="w-4 h-4" /> Mettre à jour le mot de passe
                </button>
              </div>
            </form>

          {/* Files / Attachments Manager */}
          <div className="mt-8 border-t border-slate-100 pt-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-emerald-600" />
              Registre des Pièces Jointes Terrain (Factures, Certificats, Photos)
            </h3>
            <p className="text-xs text-slate-500">Rattachez des justificatifs d'achats, fiches vétérinaires ou photos de maladies.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Existing files list */}
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {files.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 p-4 rounded-xl text-xs text-slate-400 text-center">
                    Aucune pièce jointe enregistrée pour le moment.
                  </div>
                ) : (
                  files.map((f, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-700 block truncate max-w-[200px]">{f.name}</span>
                        <span className="text-[10px] text-slate-400">Taille : {f.size} • Ajouté le : {f.date}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {role === 'admin' ? (
                <form onSubmit={handleFileUpload} className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      placeholder="Nom du fichier (Ex: reçu_NPK.pdf)"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      className="flex-1 border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
                    >
                      <Upload className="w-3.5 h-3.5" /> Joindre
                    </button>
                  </div>
                  <div className="border border-dashed border-slate-200 bg-slate-50/50 p-3 rounded-xl text-center text-[11px] text-slate-400 transition-colors">
                    Zone de depot reservee aux justificatifs reels de la ferme
                  </div>
                </form>
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 text-xs italic">
                  Aucun droit d importation de fichiers pour le proprietaire.
                </div>
              )}
            </div>
          </div>
      </div>
      </div>
    </div>
  );
}

