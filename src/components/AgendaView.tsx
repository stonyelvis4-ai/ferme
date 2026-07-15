/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Lock,
  Tag
} from 'lucide-react';
import { Task, UserRole } from '../types';

interface AgendaViewProps {
  role: UserRole;
  tasks: Task[];
  onToggleTaskStatus: (taskId: string) => void;
}

export default function AgendaView({
  role,
  tasks,
  onToggleTaskStatus
}: AgendaViewProps) {
  // Sort tasks by due date
  const sortedTasks = tasks.slice().sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Group tasks by date
  const groupedTasks: { [date: string]: Task[] } = {};
  sortedTasks.forEach((t) => {
    if (!groupedTasks[t.dueDate]) {
      groupedTasks[t.dueDate] = [];
    }
    groupedTasks[t.dueDate].push(t);
  });

  return (
    <div id="agenda-view" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Module Agenda & Calendrier Opérationnel
          </h2>
          <p className="text-xs text-slate-500">
            Planification consolidée de toutes les interventions agricoles, sanitaires et financières de la ferme.
          </p>
        </div>
        {role !== 'admin' && (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
            <Lock className="w-3 h-3" /> Lecture Seule (Propriétaire)
          </span>
        )}
      </div>

      {/* Agenda Timeline List grouped by date */}
      <div className="space-y-6">
        {Object.keys(groupedTasks).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
            Aucun événement programmé dans l'agenda.
          </div>
        ) : (
          Object.keys(groupedTasks).map((dateStr) => {
            const dateTasks = groupedTasks[dateStr];
            const formattedDate = new Date(dateStr).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
              <div key={dateStr} className="space-y-3">
                {/* Date header */}
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${isToday ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300'}`}></span>
                  <h3 className={`font-bold text-sm uppercase tracking-wide ${isToday ? 'text-emerald-700 font-extrabold' : 'text-slate-500'}`}>
                    {formattedDate} {isToday && "(Aujourd'hui)"}
                  </h3>
                </div>

                {/* Day events grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-5">
                  {dateTasks.map((task) => {
                    const isCompleted = task.status === 'completed';
                    const isOverdue = task.status === 'overdue';

                    // Theme styles based on source module
                    let moduleColor = "bg-slate-50 text-slate-600 border-slate-200";
                    if (task.sourceModule === 'Sanitaire') {
                      moduleColor = "bg-purple-50 text-purple-700 border-purple-100";
                    } else if (task.sourceModule === 'Stocks') {
                      moduleColor = "bg-amber-50 text-amber-700 border-amber-100";
                    } else if (task.sourceModule === 'Cultures') {
                      moduleColor = "bg-lime-50 text-lime-700 border-lime-100";
                    } else if (task.sourceModule === 'Pisciculture') {
                      moduleColor = "bg-sky-50 text-sky-700 border-sky-100";
                    }

                    return (
                      <div
                        key={task.id}
                        className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3 hover:shadow-md transition-shadow relative overflow-hidden ${
                          isCompleted ? 'border-slate-100 bg-slate-50/20 opacity-70' : 'border-slate-100'
                        }`}
                      >
                        <div>
                          {/* Event Header info */}
                          <div className="flex justify-between items-start gap-2">
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${moduleColor}`}>
                              {task.sourceModule}
                            </span>
                            
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              task.priority === 'critical' ? 'bg-rose-100 text-rose-700' :
                              task.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {task.priority}
                            </span>
                          </div>

                          {/* Event Title */}
                          <h4 className={`font-bold font-sans tracking-tight text-xs mt-2.5 ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {task.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {task.description}
                          </p>
                        </div>

                        {/* Event Footer */}
                        <div className="pt-2.5 border-t border-slate-100/50 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.reminderTime ? `Alerte : ${task.reminderTime}` : "Toute la journée"}
                          </span>
                          
                          {role === 'admin' && !isCompleted ? (
                            <button
                              onClick={() => onToggleTaskStatus(task.id)}
                              className="inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 px-3.5 py-2 text-[11px] font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-emerald-700"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Clôturer
                            </button>
                          ) : (
                            <span className={`font-semibold uppercase ${
                              isCompleted ? 'text-emerald-600' : isOverdue ? 'text-rose-600' : 'text-slate-400'
                            }`}>
                              {isCompleted ? 'Validé' : isOverdue ? 'En Retard' : 'À Faire'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}



