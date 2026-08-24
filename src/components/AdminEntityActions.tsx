/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Pencil, Trash2, TriangleAlert } from 'lucide-react';

interface AdminEntityActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  deleteLabel?: string;
  confirmDeleteTitle?: string;
  confirmDeleteDescription?: string;
  confirmDeleteActionLabel?: string;
  compact?: boolean;
}

export default function AdminEntityActions({
  onEdit,
  onDelete,
  editLabel = 'Modifier',
  deleteLabel = 'Supprimer',
  confirmDeleteTitle = 'Confirmer la suppression',
  confirmDeleteDescription = 'Cette action est definitive et restera tracee dans l’historique.',
  confirmDeleteActionLabel = 'Supprimer',
  compact = false
}: AdminEntityActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const buttonClass = compact
    ? 'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition'
    : 'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] font-semibold transition';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          className={`${buttonClass} border-emerald-700 bg-emerald-600 text-white shadow-md shadow-emerald-900/20 hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700`}
        >
          <Pencil className="h-3.5 w-3.5" />
          {editLabel}
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className={`${buttonClass} border-rose-100 bg-rose-50 text-rose-700 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {deleteLabel}
        </button>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-confirm-delete-title"
            className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <TriangleAlert className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 id="admin-confirm-delete-title" className="text-base font-bold text-slate-900">
                  {confirmDeleteTitle}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {confirmDeleteDescription}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  onDelete();
                }}
                className="inline-flex items-center justify-center rounded-full border border-rose-700 bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-900/20 transition hover:border-rose-800 hover:bg-rose-700"
              >
                {confirmDeleteActionLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
