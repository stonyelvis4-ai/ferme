/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface FormDialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent) => void;
  children: React.ReactNode;
}

export default function FormDialog({
  open,
  title,
  subtitle,
  confirmLabel,
  cancelLabel = 'Annuler',
  confirmDisabled = false,
  onCancel,
  onSubmit,
  children,
}: FormDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 sm:items-center sm:p-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-2xl shadow-slate-950/20">
        <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-lime-50 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              Fermer
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          {children}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={confirmDisabled}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:border-emerald-800 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
