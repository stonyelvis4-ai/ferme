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
  Users
} from 'lucide-react';
import { FarmSettings, UserRole } from '../types';
import { AuthUser } from '../services/fermApi';

interface SettingsViewProps {
  role: UserRole;
  settings: FarmSettings;
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
  onCreateOwner: (payload: {
    name: string;
    email: string;
    password: string;
  }) => void;
}

export default function SettingsView({
  role,
  settings,
  owners,
  onUpdateSettings,
  onTestAlarm,
  onChangePassword,
  onCreateOwner
}: SettingsViewProps) {
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const [files, setFiles] = useState<{ name: string; size: string; date: string }[]>([]);

  const [newFileName, setNewFileName] = useState('');

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

    alert("Paramètres de la ferme enregistrés avec succès !");
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
    alert("Pièce jointe ajoutée avec succès au registre de la ferme !");
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'admin') return;
    onChangePassword({
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: confirmPassword,
    });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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
            Module Paramètres de l'Exploitation
          </h2>
          <p className="text-xs text-slate-500">
            Configurez les métriques métier de votre ferme et gérez les comptes administrateur et propriétaire.
          </p>
        </div>
      </div>

      {/* Farm Settings Form */}
      <div className="grid grid-cols-1 gap-6">
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
                <span className="mt-1 block text-sm font-semibold text-emerald-900">{currency}</span>
                <p className="mt-1 text-[11px] text-emerald-800">Cette devise sera utilisée dans les modules connectés.</p>
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
                  <option value="FCFA">Franc CFA (FCFA)</option>
                  <option value="EUR">Euro (â‚¬)</option>
                  <option value="USD">Dollar US ($)</option>
                </select>
                <p className="mt-1 text-[10px] text-slate-500">Devise utilisée pour les coûts et revenus.</p>
              </div>
            </div>

            {role === 'admin' ? (
              <div className="flex justify-end pt-2">
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

              <div className="flex items-center justify-between gap-3">
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
                <div className="mt-4 flex justify-end">
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
                      Aucun proprietaire n'est encore rattache a cette ferme.
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
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Nom du proprietaire</label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Ex. Jean Proprietaire"
                      className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
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
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Mot de passe initial</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="Minimum 8 caracteres"
                      className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <div className="flex justify-end">
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

          {role === 'admin' && (
            <form onSubmit={handlePasswordSubmit} className="mt-8 border-t border-slate-100 pt-6 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                Changement de mot de passe administrateur
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Mot de passe actuel</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Mot de passe utilisé actuellement.</p>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Minimum 8 caractères.</p>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Confirmation</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-slate-300 bg-slate-50/70 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Doit être identique au nouveau mot de passe.</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
                >
                  <KeyRound className="w-4 h-4" /> Mettre à jour le mot de passe
                </button>
              </div>
            </form>
          )}

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
                  <div className="flex gap-2">
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
                    📁 Zone de dépôt réservée aux justificatifs réels de la ferme
                  </div>
                </form>
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 text-xs italic">
                  Aucun droit d'importation de fichiers pour le propriétaire.
                </div>
              )}
            </div>
          </div>
      </div>
      </div>
    </div>
  );
}

