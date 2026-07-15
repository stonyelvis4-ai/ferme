/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

interface AdminEntityActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  deleteLabel?: string;
  compact?: boolean;
}

export default function AdminEntityActions({
  onEdit,
  onDelete,
  editLabel = 'Modifier',
  deleteLabel = 'Supprimer',
  compact = false
}: AdminEntityActionsProps) {
  const buttonClass = compact
    ? 'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition'
    : 'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] font-semibold transition';

  return (
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
        onClick={onDelete}
        className={`${buttonClass} border-rose-100 bg-rose-50 text-rose-700 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {deleteLabel}
      </button>
    </div>
  );
}
