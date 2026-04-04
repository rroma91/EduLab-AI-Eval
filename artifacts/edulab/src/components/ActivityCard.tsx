import type { Activity } from "@/lib/supabase";
import { formatDate, cn } from "@/lib/utils";

interface Props {
  activity: Activity;
  onEdit: () => void;
  onDelete: () => void;
  onGrades: () => void;
  onDuplicate: () => void;
}

export default function ActivityCard({ activity, onEdit, onDelete, onGrades, onDuplicate }: Props) {
  const isExpired = new Date(activity.deadline) < new Date();

  return (
    <div className="bg-[#111827] border border-slate-700/50 rounded-xl p-5 hover:border-indigo-500/50 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              activity.type === "grupal"
                ? "bg-purple-500/20 text-purple-400"
                : "bg-blue-500/20 text-blue-400"
            )}>
              {activity.type === "grupal" ? "Grupal" : "Individual"}
            </span>
            {activity.group_name && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 font-mono">
                {activity.group_name}
              </span>
            )}
            {isExpired && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                Vencida
              </span>
            )}
          </div>
          <h3 className="font-semibold text-white truncate">{activity.name}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{activity.subject}</p>
        </div>
      </div>

      <p className="text-slate-500 text-xs line-clamp-2 mb-4">{activity.description}</p>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Código de acceso</p>
          <span className="font-mono font-bold text-indigo-400 text-lg tracking-widest">
            {activity.access_code}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-0.5">Fecha límite</p>
          <p className={cn("text-sm font-medium", isExpired ? "text-red-400" : "text-slate-300")}>
            {formatDate(activity.deadline)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-slate-700/50">
        <button
          onClick={onGrades}
          className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 px-3 rounded-lg font-medium transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Calificaciones
        </button>
        <button
          onClick={onDuplicate}
          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition"
          title="Duplicar para otro grupo"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          title="Editar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
          title="Eliminar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
