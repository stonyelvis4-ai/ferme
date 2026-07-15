/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  User,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { Task, Priority, UserRole } from '../types';
import AdminEntityActions from './AdminEntityActions';

interface TasksViewProps {
  role: UserRole;
  tasks: Task[];
  onAddTask: (newTask: Omit<Task, 'id' | 'status'>) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function TasksView({
  role,
  tasks,
  onAddTask,
  onToggleTaskStatus,
  onUpdateTask,
  onDeleteTask
}: TasksViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignedTo, setAssignedTo] = useState('');
  const [sourceModule, setSourceModule] = useState('Ferme');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    onAddTask({
      title,
      description,
      priority,
      startDate: new Date().toISOString().split('T')[0],
      dueDate,
      assignedTo,
      sourceModule
    });

    // Reset
    setTitle('');
    setDescription('');
    setAssignedTo('');
    setShowAddForm(false);
  };

  const handleEditTask = (task: Task) => {
    const titleValue = window.prompt('Titre de la tâche', task.title);
    if (!titleValue) return;
    const descriptionValue = window.prompt('Description', task.description) ?? task.description;
    onUpdateTask(task.id, {
      title: titleValue,
      description: descriptionValue
    });
  };

  return (
    <div id="tasks-view" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-600" />
            Module Organiseur de Tâches & Travaux
          </h2>
          <p className="text-xs text-slate-500">
            Affectez des travaux aux ouvriers, suivez l'avancement et assurez le bon fonctionnement quotidien.
          </p>
        </div>
        {role === 'admin' ? (
          <button
            id="btn-add-task"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" /> Nouvelle Tâche
          </button>
        ) : (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            <Lock className="w-3 h-3" /> Lecture Seule (Propriétaire)
          </span>
        )}
      </div>

      {/* Task Creation Form */}
      {showAddForm && role === 'admin' && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in"
        >
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2">
            Créer et affecter une nouvelle tâche
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Intitulé de la tâche *</label>
              <input
                id="task-title-input"
                type="text"
                required
                placeholder="Ex: Nettoyage mangeoires Poulailler B"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-2xl p-2.5 shadow-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Priorité *</label>
              <select
                id="task-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full border border-slate-200 rounded-2xl p-2.5 shadow-sm bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="low">Faible</option>
                <option value="normal">Normale</option>
                <option value="high">Élevée</option>
                <option value="critical">Critique</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Échéance de fin *</label>
              <input
                id="task-due-input"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-slate-200 rounded-2xl p-2.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description explicative</label>
              <input
                id="task-desc-input"
                type="text"
                placeholder="Préciser les consignes techniques"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-2xl p-2.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ouvrier responsable</label>
              <input
                id="task-assigned-input"
                type="text"
                placeholder="Nom de l'exécutant"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full border border-slate-200 rounded-2xl p-2.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Module d'origine</label>
              <select
                id="task-module-select"
                value={sourceModule}
                onChange={(e) => setSourceModule(e.target.value)}
                className="w-full border border-slate-200 rounded-2xl p-2.5 bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Ferme">Ferme (Général)</option>
                <option value="Élevage">Élevage</option>
                <option value="Pondeuses">Pondeuses</option>
                <option value="Pisciculture">Pisciculture</option>
                <option value="Cultures">Cultures</option>
                <option value="Stocks">Stocks</option>
                <option value="Bâtiments">Bâtiments</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 p-1 border-t border-slate-50">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
            >
              Affecter la Tâche
            </button>
          </div>
        </form>
      )}

      {/* Task checklist cards list */}
      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Aucune tâche enregistrée.</p>
          <p className="mt-2 text-xs text-slate-500">
            Les tâches créées depuis les modules métier ou manuellement apparaîtront ici avec leur suivi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = task.status === 'overdue';

            return (
              <div
                key={task.id}
                className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3 hover:shadow-md transition-shadow relative overflow-hidden ${
                  isCompleted ? 'border-slate-100 bg-slate-50/20 opacity-70' : 'border-slate-100'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {task.sourceModule}
                    </span>
                    
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      task.priority === 'critical' ? 'bg-rose-100 text-rose-700 animate-pulse' :
                      task.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {task.priority}
                    </span>
                  </div>

                  <h3 className={`font-bold text-slate-800 text-sm mt-3 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                    {task.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                </div>

                <div className="pt-2.5 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400">
                  <div className="space-y-1">
                    <span className="flex items-center gap-1 text-[10px]">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Échéance : {task.dueDate}
                    </span>
                    {task.assignedTo && (
                      <span className="flex items-center gap-1 text-[10px]">
                        <User className="w-3.5 h-3.5 text-slate-400" /> Assigné à : {task.assignedTo}
                      </span>
                    )}
                  </div>

                  {role === 'admin' && !isCompleted ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => onToggleTaskStatus(task.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Clôturer
                      </button>
                      <AdminEntityActions
                        compact
                        onEdit={() => handleEditTask(task)}
                        onDelete={() => {
                          if (window.confirm(`Supprimer la tâche ${task.title} ?`)) {
                            onDeleteTask(task.id);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <span className={`font-semibold uppercase text-[10px] ${
                      isCompleted ? 'text-emerald-600' : isOverdue ? 'text-rose-600 font-bold' : 'text-slate-400'
                    }`}>
                      {isCompleted ? 'Validé' : isOverdue ? 'En Retard' : 'À Faire'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

