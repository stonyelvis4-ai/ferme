/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import farmScene from '../../../prototype/assets/ferme-mixte.jpg';

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

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
      <path d="m21 2-9.6 9.6" />
      <circle cx="7.5" cy="15.5" r="5.5" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h.01" />
      <path d="M8.5 16.429a5 5 0 0 1 7 0" />
      <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
      <path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
      <path d="M2 8.82a15 15 0 0 1 4.177-2.318" />
      <path d="M22 8.82a15 15 0 0 0-11.288-3.764" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 21a6 6 0 0 0-12 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
        <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
        <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-4.86" />
        <path d="m2 2 20 20" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

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
  const [cursorGlow, setCursorGlow] = useState({ x: 0, y: 0, active: false });
  const isLoginMode = authMode === 'login' || !allowRegister;

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setCursorGlow({ x: event.clientX, y: event.clientY, active: true });
    };
    const handleMouseLeave = () => {
      setCursorGlow((previous) => ({ ...previous, active: false }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
    };
  }, []);

  return (
    <div className="ferm-auth">
      <style>{`
        .ferm-auth {
          --text: #0f172a;
          --text-soft: #334155;
          --text-muted: #64748b;
          --border: rgba(15, 23, 42, 0.1);
          --border-strong: rgba(15, 23, 42, 0.14);
          --accent: #0d9488;
          --accent-bright: #14b8a6;
          --accent-soft: rgba(13, 148, 136, 0.1);
          --accent-glow: rgba(13, 148, 136, 0.25);
          --error: #dc2626;
          --error-bg: #fef2f2;
          --success: #059669;
          --success-bg: #ecfdf5;
          --radius: 18px;
          --radius-sm: 14px;
          --radius-pill: 999px;
          --shadow: 0 20px 50px rgba(15, 23, 42, 0.1);
          --shadow-lg: 0 28px 60px rgba(15, 23, 42, 0.12);
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
          font-family: "Inter", system-ui, -apple-system, sans-serif;
          color: var(--text);
          -webkit-font-smoothing: antialiased;
          background: #e8f7f2;
        }
        .ferm-auth * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        .auth-bg-farm {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          z-index: 0;
          transform: scale(1.06);
          filter: saturate(1.08) brightness(1.08) contrast(1.02);
          will-change: transform;
        }
        .auth-bg-overlay {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background:
            radial-gradient(ellipse 90% 70% at 15% 20%, rgba(167, 243, 208, 0.28) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 90% 10%, rgba(204, 251, 241, 0.32) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 50% 100%, rgba(236, 253, 245, 0.45) 0%, transparent 55%),
            linear-gradient(
              115deg,
              rgba(248, 252, 250, 0.82) 0%,
              rgba(240, 253, 250, 0.62) 32%,
              rgba(255, 255, 255, 0.42) 52%,
              rgba(248, 250, 252, 0.75) 100%
            );
        }
        .auth-bg-grain {
          position: fixed;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 180px;
          mix-blend-mode: multiply;
        }
        .auth-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(70px);
          z-index: 2;
          pointer-events: none;
          opacity: 0.45;
          animation: authFloatOrb 12s ease-in-out infinite;
        }
        .auth-orb-1 {
          width: 300px;
          height: 300px;
          background: rgba(45, 212, 191, 0.4);
          top: 5%;
          left: 5%;
        }
        .auth-orb-2 {
          width: 240px;
          height: 240px;
          background: rgba(110, 231, 183, 0.35);
          bottom: 10%;
          right: 15%;
          animation-delay: -4s;
          animation-duration: 15s;
        }
        .auth-orb-3 {
          width: 180px;
          height: 180px;
          background: rgba(153, 246, 228, 0.4);
          top: 50%;
          left: 42%;
          animation-delay: -7s;
          animation-duration: 18s;
        }
        @keyframes authFloatOrb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(24px, -20px) scale(1.06); }
          66% { transform: translate(-16px, 16px) scale(0.96); }
        }
        .auth-cursor-glow {
          position: fixed;
          width: 360px;
          height: 360px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(45, 212, 191, 0.14) 0%, transparent 70%);
          pointer-events: none;
          z-index: 2;
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .auth-cursor-glow.active {
          opacity: 1;
        }
        .auth-page {
          position: relative;
          z-index: 3;
          display: grid;
          grid-template-columns: 1.15fr 0.95fr;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          min-height: 100vh;
          gap: 1.5rem;
          padding: 2.25rem 2rem;
          align-items: stretch;
        }
        .auth-hero {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.75rem 1.5rem 1.25rem 0.75rem;
        }
        .auth-hero-top {
          max-width: 560px;
        }
        .auth-logo-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
          animation: authFadeUp 0.7s ease both;
        }
        .auth-logo-mark {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, #2dd4bf, #0d9488);
          display: grid;
          place-items: center;
          box-shadow: 0 8px 24px var(--accent-glow);
          animation: authPulseGlow 3.5s ease-in-out infinite;
        }
        .auth-logo-mark svg {
          width: 24px;
          height: 24px;
          color: #fff;
        }
        .auth-logo-text {
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text);
        }
        .auth-logo-text span {
          color: var(--accent);
        }
        @keyframes authPulseGlow {
          0%, 100% { box-shadow: 0 8px 24px var(--accent-glow); }
          50% { box-shadow: 0 10px 32px rgba(13, 148, 136, 0.4); }
        }
        .auth-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 1.15rem;
          animation: authFadeUp 0.7s 0.08s ease both;
        }
        .auth-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--accent-bright);
          box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.55);
          animation: authLivePulse 1.8s ease-out infinite;
        }
        @keyframes authLivePulse {
          0% { box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.5); }
          70% { box-shadow: 0 0 0 10px rgba(20, 184, 166, 0); }
          100% { box-shadow: 0 0 0 0 rgba(20, 184, 166, 0); }
        }
        .auth-hero h1 {
          font-size: clamp(2.05rem, 4.2vw, 3.2rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.035em;
          margin-bottom: 1.25rem;
          color: var(--text);
          animation: authFadeUp 0.75s 0.15s ease both;
        }
        .auth-hero-lead {
          font-size: 1.02rem;
          line-height: 1.65;
          color: var(--text-soft);
          max-width: 480px;
          margin-bottom: 1.75rem;
          animation: authFadeUp 0.75s 0.22s ease both;
        }
        .auth-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          animation: authFadeUp 0.75s 0.3s ease both;
        }
        .auth-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.48rem 1rem;
          border-radius: var(--radius-pill);
          border: 1.5px solid var(--border-strong);
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          font-size: 0.84rem;
          font-weight: 500;
          color: var(--text);
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
          transition: transform 0.2s, background 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .auth-pill:hover {
          transform: translateY(-2px);
          background: #fff;
          border-color: rgba(13, 148, 136, 0.4);
          box-shadow: 0 8px 20px var(--accent-glow);
        }
        .auth-feature-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.85rem;
          margin-top: 2.75rem;
          max-width: 560px;
          animation: authFadeUp 0.8s 0.4s ease both;
        }
        .auth-feature-card {
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(16px);
          border: 1.5px solid rgba(255, 255, 255, 0.9);
          border-radius: var(--radius);
          padding: 1.15rem 1rem 1.2rem;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
          transition: transform 0.25s, background 0.25s, border-color 0.25s, box-shadow 0.25s;
        }
        .auth-feature-card:hover {
          transform: translateY(-4px);
          background: #fff;
          border-color: rgba(13, 148, 136, 0.3);
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.1);
        }
        .auth-feature-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: var(--accent-soft);
          color: var(--accent);
          display: grid;
          place-items: center;
          margin-bottom: 0.85rem;
          border: 1px solid rgba(13, 148, 136, 0.15);
        }
        .auth-feature-icon svg {
          width: 16px;
          height: 16px;
        }
        .auth-feature-card h3 {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          line-height: 1.35;
          margin-bottom: 0.4rem;
          color: var(--text);
        }
        .auth-feature-card p {
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .auth-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 0;
        }
        .auth-card {
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(24px) saturate(1.2);
          border: 1px solid rgba(255, 255, 255, 0.95);
          border-radius: 24px;
          padding: 1.85rem 1.85rem 1.6rem;
          box-shadow: var(--shadow-lg);
          animation: authCardIn 0.85s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
          position: relative;
          overflow: hidden;
        }
        .auth-card::before {
          content: "";
          position: absolute;
          top: -40%;
          right: -30%;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(45, 212, 191, 0.18) 0%, transparent 70%);
          pointer-events: none;
          animation: authFloatOrb 10s ease-in-out infinite;
        }
        @keyframes authCardIn {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes authFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .auth-nav {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 1.35rem;
          position: relative;
        }
        .auth-nav svg {
          width: 14px;
          height: 14px;
          color: var(--accent);
        }
        .auth-tabs {
          display: inline-flex;
          gap: 0.6rem;
          margin-bottom: 0.95rem;
        }
        .auth-tab {
          border: none;
          background: none;
          cursor: pointer;
          font: inherit;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .auth-tab.active {
          color: var(--accent);
        }
        .auth-label {
          font-size: 0.88rem;
          font-weight: 500;
          color: var(--text-soft);
          margin-bottom: 0.3rem;
          position: relative;
        }
        .auth-card h2 {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.25;
          margin-bottom: 0.55rem;
          color: var(--text);
          position: relative;
        }
        .auth-card h2 .brand {
          color: var(--accent);
        }
        .auth-desc {
          font-size: 0.9rem;
          line-height: 1.55;
          color: var(--text-muted);
          margin-bottom: 1.2rem;
          position: relative;
        }
        .auth-register-box {
          border: 1.5px solid rgba(13, 148, 136, 0.12);
          border-radius: var(--radius-sm);
          padding: 0.95rem;
          margin-bottom: 1.25rem;
          background: linear-gradient(135deg, rgba(236, 253, 245, 0.92), rgba(255, 255, 255, 0.7));
        }
        .auth-register-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          margin-bottom: 0.8rem;
          padding: 0.42rem 0.8rem;
          border-radius: var(--radius-pill);
          border: 1px solid rgba(13, 148, 136, 0.18);
          background: rgba(255,255,255,0.88);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #0f766e;
        }
        .auth-register-step {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.8rem;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.9);
          background: rgba(255,255,255,0.78);
        }
        .auth-register-step + .auth-register-step {
          margin-top: 0.7rem;
        }
        .auth-register-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: var(--accent-soft);
          color: var(--accent);
          flex-shrink: 0;
          border: 1px solid rgba(13, 148, 136, 0.15);
        }
        .auth-register-icon svg {
          width: 16px;
          height: 16px;
        }
        .auth-register-step strong {
          display: block;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0.18rem;
        }
        .auth-register-step span {
          display: block;
          font-size: 0.76rem;
          line-height: 1.45;
          color: var(--text-muted);
        }
        .auth-info-banner {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          padding: 0.85rem 1rem;
          border-radius: var(--radius-sm);
          border: 1.5px solid var(--border);
          background: #f8fafc;
          font-size: 0.84rem;
          line-height: 1.45;
          color: var(--text-soft);
          margin-bottom: 1.25rem;
          position: relative;
        }
        .auth-info-banner svg {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          margin-top: 2px;
          color: var(--accent);
        }
        .auth-form-group {
          margin-bottom: 1.05rem;
          position: relative;
        }
        .auth-form-group label {
          display: block;
          font-size: 0.84rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 0.4rem;
        }
        .auth-input-wrap {
          position: relative;
        }
        .ferm-auth input[type="email"],
        .ferm-auth input[type="password"],
        .ferm-auth input[type="text"] {
          width: 100%;
          padding: 0.82rem 1rem;
          border: 1.5px solid var(--border-strong);
          border-radius: var(--radius-sm);
          background: #fff;
          font-family: inherit;
          font-size: 0.92rem;
          color: var(--text);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .ferm-auth input.with-toggle {
          padding-right: 2.75rem;
        }
        .ferm-auth input::placeholder {
          color: #94a3b8;
        }
        .ferm-auth input:hover {
          border-color: #cbd5e1;
        }
        .ferm-auth input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.18);
        }
        .auth-toggle-password {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: 4px;
          display: flex;
          border-radius: 6px;
          transition: color 0.15s;
        }
        .auth-toggle-password:hover {
          color: var(--text);
        }
        .auth-toggle-password svg {
          width: 18px;
          height: 18px;
        }
        .auth-field-help {
          margin-top: 0.35rem;
          font-size: 0.74rem;
          line-height: 1.4;
          color: var(--text-muted);
        }
        .auth-submit {
          width: 100%;
          margin-top: 0.3rem;
          margin-bottom: 1.1rem;
          min-height: 54px;
          padding: 0.8rem 1.1rem;
          border: none;
          border-radius: var(--radius-sm);
          background: linear-gradient(135deg, #2dd4bf 0%, #14b8a6 45%, #0d9488 100%);
          color: #fff;
          font-family: inherit;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 10px 28px rgba(13, 148, 136, 0.3);
          transition: transform 0.15s, box-shadow 0.2s, filter 0.15s, opacity 0.2s;
          position: relative;
          overflow: hidden;
        }
        .auth-submit svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }
        .auth-submit::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(255, 255, 255, 0.35) 50%, transparent 70%);
          transform: translateX(-120%);
          transition: transform 0.5s;
        }
        .auth-submit:hover:not(:disabled)::after {
          transform: translateX(120%);
        }
        .auth-submit:hover:not(:disabled) {
          filter: brightness(1.05);
          box-shadow: 0 14px 36px rgba(13, 148, 136, 0.4);
          transform: translateY(-2px);
        }
        .auth-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        .auth-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
          background: #e2e8f0;
          color: #94a3b8;
        }
        .auth-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: authSpin 0.7s linear infinite;
        }
        @keyframes authSpin {
          to { transform: rotate(360deg); }
        }
        .auth-admin-box {
          border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 1rem 1.05rem;
          margin-bottom: 1.1rem;
          background: #f8fafc;
          position: relative;
        }
        .auth-admin-title {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0.4rem;
        }
        .auth-admin-title svg {
          width: 15px;
          height: 15px;
          color: var(--accent);
        }
        .auth-admin-box p {
          font-size: 0.84rem;
          line-height: 1.5;
          color: var(--text-muted);
        }
        .auth-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
          position: relative;
        }
        .auth-pwd-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.85rem;
          border-radius: var(--radius-pill);
          border: 1.5px solid var(--border);
          background: #fff;
          font-size: 0.74rem;
          font-weight: 500;
          color: var(--text-soft);
          line-height: 1.3;
          max-width: 210px;
        }
        .auth-pwd-chip svg {
          width: 13px;
          height: 13px;
          flex-shrink: 0;
          color: var(--accent);
        }
        .auth-backend-note {
          font-size: 0.72rem;
          line-height: 1.4;
          color: var(--text-muted);
          flex: 1;
          min-width: 140px;
          text-align: right;
        }
        .auth-alert {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
          padding: 0.8rem 0.95rem;
          border-radius: var(--radius-sm);
          font-size: 0.84rem;
          line-height: 1.45;
          margin-bottom: 1.1rem;
          position: relative;
          background: var(--error-bg);
          color: var(--error);
          border: 1px solid #fecaca;
        }
        .auth-alert svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .auth-scene-badge {
          position: fixed;
          bottom: 1.25rem;
          left: 1.25rem;
          z-index: 10;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.5rem 0.9rem;
          border-radius: var(--radius-pill);
          border: 1.5px solid var(--border-strong);
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-soft);
        }
        .auth-scene-badge svg {
          width: 15px;
          height: 15px;
          color: var(--accent);
          flex-shrink: 0;
        }
        @media (max-width: 980px) {
          .auth-page {
            grid-template-columns: 1fr;
            padding: 1.5rem 1.15rem 5rem;
            gap: 1.75rem;
          }
          .auth-hero {
            padding: 0.5rem 0 0;
          }
          .auth-feature-cards {
            margin-top: 1.75rem;
            max-width: 100%;
          }
          .auth-bg-overlay {
            background:
              radial-gradient(ellipse 90% 50% at 50% 0%, rgba(167, 243, 208, 0.3) 0%, transparent 50%),
              linear-gradient(
                180deg,
                rgba(248, 252, 250, 0.65) 0%,
                rgba(255, 255, 255, 0.72) 45%,
                rgba(248, 250, 252, 0.88) 100%
              );
          }
        }
        @media (max-width: 560px) {
          .auth-feature-cards {
            grid-template-columns: 1fr;
          }
          .auth-card {
            padding: 1.4rem 1.2rem;
            border-radius: 20px;
          }
          .auth-hero h1 {
            font-size: 1.85rem;
          }
          .auth-footer {
            flex-direction: column;
            align-items: flex-start;
          }
          .auth-backend-note {
            text-align: left;
          }
          .auth-cursor-glow {
            display: none;
          }
        }
      `}</style>

      <img className="auth-bg-farm" src={farmScene} alt="" aria-hidden="true" />
      <div className="auth-bg-overlay" aria-hidden="true" />
      <div className="auth-bg-grain" aria-hidden="true" />
      <div className="auth-orb auth-orb-1" aria-hidden="true" />
      <div className="auth-orb auth-orb-2" aria-hidden="true" />
      <div className="auth-orb auth-orb-3" aria-hidden="true" />
      <div
        className={`auth-cursor-glow${cursorGlow.active ? ' active' : ''}`}
        aria-hidden="true"
        style={{ left: cursorGlow.x, top: cursorGlow.y }}
      />

      <div className="auth-page">
        <section className="auth-hero" aria-label="Présentation FERM+">
          <div className="auth-hero-top">
            <div className="auth-logo-row">
              <div className="auth-logo-mark" aria-hidden="true">
                <LeafIcon />
              </div>
              <div className="auth-logo-text">FERM<span>+</span></div>
            </div>

            <p className="auth-eyebrow">
              <span className="auth-live-dot" aria-hidden="true" />
              Accès sécurisé FERM+
            </p>
            <h1>Prenez la main sur votre plateforme agricole en quelques secondes.</h1>
            <p className="auth-hero-lead">
              La création libre est réservée au premier administrateur. Les propriétaires
              sont ensuite rattachés depuis l&apos;espace d&apos;administration.
            </p>
            <div className="auth-pills">
              <span className="auth-pill">Admin unique</span>
              <span className="auth-pill">Propriétaires rattachés</span>
              <span className="auth-pill">Mobile prêt</span>
            </div>
          </div>

          <div className="auth-feature-cards">
            <article className="auth-feature-card">
              <div className="auth-feature-icon" aria-hidden="true">
                <KeyIcon />
              </div>
              <h3>Création admin verrouillée</h3>
              <p>1 seul compte maître</p>
            </article>

            <article className="auth-feature-card">
              <div className="auth-feature-icon" aria-hidden="true">
                <ActivityIcon />
              </div>
              <h3>Flux métier propre</h3>
              <p>Données reliées à la ferme</p>
            </article>

            <article className="auth-feature-card">
              <div className="auth-feature-icon" aria-hidden="true">
                <WifiIcon />
              </div>
              <h3>Connexion rapide</h3>
              <p>Accès web et mobile</p>
            </article>
          </div>
        </section>

        <section className="auth-panel" aria-label="Formulaire de connexion">
          <div className="auth-card">
            <div className="auth-nav">
              <KeyIcon />
              {isLoginMode ? 'Connexion' : 'Inscription admin'}
            </div>

            {allowRegister ? (
              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab${authMode === 'login' ? ' active' : ''}`}
                  onClick={() => setAuthMode('login')}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  className={`auth-tab${authMode === 'register' ? ' active' : ''}`}
                  onClick={() => setAuthMode('register')}
                >
                  Inscription admin
                </button>
              </div>
            ) : null}

            <p className="auth-label">{isLoginMode ? 'Connexion' : 'Inscription admin'}</p>
            <h2>
              {isLoginMode ? 'Accéder à votre espace' : 'Créer le premier compte administrateur'} <span className="brand">FERM+</span>
            </h2>
            <p className="auth-desc">
              {isLoginMode
                ? 'Connectez-vous avec un compte administrateur ou un compte propriétaire déjà créé.'
                : 'Seul un administrateur peut être créé librement. Les comptes propriétaires seront ensuite rattachés à une ferme.'}
            </p>

            {!isLoginMode ? (
              <div className="auth-register-box">
                <div className="auth-register-chip">
                  <UserIcon />
                  Première configuration
                </div>

                <div className="auth-register-step">
                  <div className="auth-register-icon">
                    <KeyIcon />
                  </div>
                  <div>
                    <strong>Compte maître</strong>
                    <span>Cet administrateur deviendra le compte principal de la plateforme.</span>
                  </div>
                </div>

                <div className="auth-register-step">
                  <div className="auth-register-icon">
                    <LeafIcon />
                  </div>
                  <div>
                    <strong>Ferme initiale</strong>
                    <span>FERM+ préparera automatiquement la première ferme rattachée à ce compte.</span>
                  </div>
                </div>

                <div className="auth-register-step">
                  <div className="auth-register-icon">
                    <InfoIcon />
                  </div>
                  <div>
                    <strong>Accès sécurisé</strong>
                    <span>L&apos;email et le mot de passe serviront ensuite sur ordinateur comme sur mobile.</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="auth-info-banner">
              <InfoIcon />
              <span>
                {isLoginMode
                  ? 'L’inscription administrateur est déjà verrouillée pour cette plateforme.'
                  : 'Le premier administrateur crée la ferme puis rattache les propriétaires depuis le back-office.'}
              </span>
            </div>

            {authError ? (
              <div className="auth-alert" role="alert">
                <InfoIcon />
                <span>{authError}</span>
              </div>
            ) : null}

            <form onSubmit={isLoginMode ? onLogin : onRegister} noValidate>
              {!isLoginMode ? (
                <div className="auth-form-group">
                  <label htmlFor="register-name">Nom complet</label>
                  <div className="auth-input-wrap">
                    <input
                      id="register-name"
                      type="text"
                      value={registerName}
                      onChange={(event) => setRegisterName(event.target.value)}
                      placeholder="Administrateur FERM+"
                      required
                    />
                  </div>
                  <div className="auth-field-help">Nom du responsable principal qui pilotera toute la plateforme.</div>
                </div>
              ) : null}

              <div className="auth-form-group">
                <label htmlFor={isLoginMode ? 'email' : 'register-email'}>Email</label>
                <div className="auth-input-wrap">
                  <input
                    id={isLoginMode ? 'email' : 'register-email'}
                    type="email"
                    value={isLoginMode ? loginEmail : registerEmail}
                    onChange={(event) =>
                      isLoginMode ? setLoginEmail(event.target.value) : setRegisterEmail(event.target.value)
                    }
                    placeholder="admin@ferm.plus"
                    autoComplete="email"
                    required
                  />
                </div>
                {!isLoginMode ? (
                  <div className="auth-field-help">Cette adresse sera rattachée au compte administrateur principal.</div>
                ) : null}
              </div>

              <div className="auth-form-group">
                <label htmlFor={isLoginMode ? 'password' : 'register-password'}>Mot de passe</label>
                <div className="auth-input-wrap">
                  <input
                    id={isLoginMode ? 'password' : 'register-password'}
                    className="with-toggle"
                    type={showPassword ? 'text' : 'password'}
                    value={isLoginMode ? loginPassword : registerPassword}
                    onChange={(event) =>
                      isLoginMode ? setLoginPassword(event.target.value) : setRegisterPassword(event.target.value)
                    }
                    placeholder="••••••••"
                    autoComplete={isLoginMode ? 'current-password' : 'new-password'}
                    required
                  />
                  <button
                    type="button"
                    className="auth-toggle-password"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    <EyeIcon hidden={showPassword} />
                  </button>
                </div>
                {!isLoginMode ? (
                  <div className="auth-field-help">Choisissez un mot de passe solide d’au moins 8 caractères.</div>
                ) : null}
              </div>

              {!isLoginMode ? (
                <div className="auth-form-group">
                  <label htmlFor="register-confirm-password">Confirmer le mot de passe</label>
                  <div className="auth-input-wrap">
                    <input
                      id="register-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={registerConfirmPassword}
                      onChange={(event) => setRegisterConfirmPassword(event.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div className="auth-field-help">La confirmation doit être identique au mot de passe choisi.</div>
                </div>
              ) : null}

              <button type="submit" className="auth-submit" disabled={authBusy}>
                {authBusy ? <span className="auth-spinner" aria-hidden="true" /> : <UserIcon />}
                <span>{isLoginMode ? 'Se connecter' : 'Créer le compte'}</span>
              </button>
            </form>

            <div className="auth-admin-box">
              <div className="auth-admin-title">
                <InfoIcon />
                Accès administrateur
              </div>
              <p>
                {isLoginMode
                  ? 'Utilisez vos identifiants pour accéder aux fermes, tâches, alertes et modules métier.'
                  : 'Le premier administrateur crée la ferme puis rattache les propriétaires depuis le back-office.'}
              </p>
            </div>

            <div className="auth-footer">
              <span className="auth-pwd-chip">
                <KeyIcon />
                Changement de mot de passe disponible après connexion
              </span>
              <p className="auth-backend-note">Connexion admin et propriétaire contrôlée par le backend Laravel.</p>
            </div>
          </div>
        </section>
      </div>

      <div className="auth-scene-badge" aria-hidden="true">
        <LeafIcon />
        Ferme mixte - cultures & élevage
      </div>
    </div>
  );
}
