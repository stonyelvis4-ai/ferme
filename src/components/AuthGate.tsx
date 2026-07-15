/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Activity,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Sprout,
  UserCircle2,
  UserPlus,
  Wifi,
} from 'lucide-react';

type AuthGateProps = {
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  allowRegister: boolean;
  authBusy: boolean;
  authError: string;
  showPassword: boolean;
  setShowPassword: (value: boolean | ((previous: boolean) => boolean)) => void;
  loginEmail: string;
  setLoginEmail: (value: string) => void;
  loginPassword: string;
  setLoginPassword: (value: string) => void;
  registerName: string;
  setRegisterName: (value: string) => void;
  registerEmail: string;
  setRegisterEmail: (value: string) => void;
  registerPassword: string;
  setRegisterPassword: (value: string) => void;
  registerConfirmPassword: string;
  setRegisterConfirmPassword: (value: string) => void;
  onLogin: (event: React.FormEvent) => void;
  onRegister: (event: React.FormEvent) => void;
};

export default function AuthGate({
  authMode,
  setAuthMode,
  allowRegister,
  authBusy,
  authError,
  showPassword,
  setShowPassword,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  registerName,
  setRegisterName,
  registerEmail,
  setRegisterEmail,
  registerPassword,
  setRegisterPassword,
  registerConfirmPassword,
  setRegisterConfirmPassword,
  onLogin,
  onRegister,
}: AuthGateProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(180deg,#effaf3_0%,#f8fafc_100%)] px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-stretch gap-6 lg:grid-cols-[1.25fr_0.95fr]">
        <section className="premium-card relative overflow-hidden p-6 md:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_30%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-strong)] text-white shadow-lg shadow-emerald-900/20">
                  <Sprout className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]">Accès sécurisé FERM+</p>
                  <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-[var(--text)] md:text-5xl">
                    Prenez la main sur votre plateforme agricole en quelques secondes.
                  </h1>
                </div>
              </div>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">
                La création libre est réservée au premier administrateur. Les propriétaires sont ensuite rattachés depuis l’espace d’administration.
              </p>

              <div className="flex flex-wrap gap-3">
                {['Admin unique', 'Propriétaires rattachés', 'Mobile prêt'].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-[var(--border)] bg-white/75 px-4 py-2 text-sm font-semibold text-[var(--text)] shadow-sm backdrop-blur"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { title: 'Création admin verrouillée', value: '1 seul compte maître', icon: KeyRound },
                { title: 'Flux métier propre', value: 'Données reliées à la ferme', icon: Activity },
                { title: 'Connexion rapide', value: 'Accès web et mobile', icon: Wifi },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-2xl border border-[var(--border)] bg-white/80 p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{item.title}</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--text)]">{item.value}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="premium-card p-6 md:p-8 lg:p-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
              <KeyRound className="h-4 w-4" />
              {authMode === 'login' || !allowRegister ? 'Connexion' : 'Inscription admin'}
            </div>
            <div>
              <p className="eyebrow">{authMode === 'login' || !allowRegister ? 'Connexion' : 'Inscription admin'}</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--text)]">
                {authMode === 'login' || !allowRegister ? 'Accéder à votre espace FERM+' : 'Créer le premier compte administrateur'}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
                {authMode === 'login' || !allowRegister
                  ? 'Connectez-vous avec un compte administrateur ou un compte propriétaire déjà créé.'
                  : 'Seul un administrateur peut être créé librement. Les comptes propriétaires seront ensuite rattachés à une ferme.'}
              </p>
            </div>
          </div>

          {allowRegister ? (
            <div className="mt-6 grid grid-cols-2 gap-2 rounded-full border border-[var(--border)] bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                  authMode === 'login' ? 'bg-white text-[var(--text)] shadow-sm' : 'text-[var(--muted)]'
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                  authMode === 'register' ? 'bg-white text-[var(--text)] shadow-sm' : 'text-[var(--muted)]'
                }`}
              >
                Inscription admin
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-slate-50 px-4 py-3 text-sm text-[var(--muted)]">
              L’inscription administrateur est déjà verrouillée pour cette plateforme.
            </div>
          )}

          {authError && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {authError}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={authMode === 'register' && allowRegister ? onRegister : onLogin}>
            {authMode === 'register' && allowRegister && (
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text)]">Nom complet</label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                  placeholder="Administrateur FERM+"
                  required
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text)]">Email</label>
              <input
                type="email"
                value={authMode === 'login' ? loginEmail : registerEmail}
                onChange={(e) =>
                  authMode === 'login' ? setLoginEmail(e.target.value) : setRegisterEmail(e.target.value)
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                placeholder="admin@ferm.plus"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text)]">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={authMode === 'login' ? loginPassword : registerPassword}
                  onChange={(e) =>
                    authMode === 'login' ? setLoginPassword(e.target.value) : setRegisterPassword(e.target.value)
                  }
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 pr-12 text-sm outline-none transition focus:border-[var(--accent)]"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-[var(--muted)] transition hover:text-[var(--text)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {authMode === 'register' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text)]">Confirmer le mot de passe</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authBusy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-strong)] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {authBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : authMode === 'login' ? <UserCircle2 className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {authMode === 'login' ? 'Se connecter' : 'Créer le compte'}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-slate-50 p-4 text-sm text-[var(--muted)]">
            <div className="flex items-center gap-2 text-[var(--text)]">
              <UserCircle2 className="h-4 w-4 text-[var(--accent-strong)]" />
              <span className="font-semibold">Accès administrateur</span>
            </div>
            <p className="mt-2">
                {authMode === 'login' || !allowRegister
                  ? 'Utilisez vos identifiants pour accéder aux fermes, tâches, alertes et modules métier.'
                  : 'Le premier administrateur crée la ferme puis rattache les propriétaires depuis le back-office.'}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 text-xs text-[var(--muted)] md:flex-row md:items-center md:justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 py-2 font-semibold text-[var(--text)]">
              <KeyRound className="h-4 w-4 text-[var(--accent-strong)]" />
              Changement de mot de passe disponible après connexion
            </span>
            <span>Connexion admin et propriétaire contrôlée par le backend Laravel.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
