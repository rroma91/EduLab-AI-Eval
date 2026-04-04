import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getSupabaseClient } from "@/lib/supabase";
import type { Activity } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { cn, generateCode } from "@/lib/utils";
import ActivityFormModal from "@/components/ActivityFormModal";
import ActivityCard from "@/components/ActivityCard";
import { getInstitutionInfo } from "@/pages/SettingsPage";

export default function AdminDashboard() {
  const { logout, username } = useAuth();
  const [, navigate] = useLocation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const inst = getInstitutionInfo();

  useEffect(() => {
    fetchActivities();
    const sb = getSupabaseClient();
    const channel = sb
      .channel("activities_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () => {
        fetchActivities();
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, []);

  const fetchActivities = async () => {
    const sb = getSupabaseClient();
    const { data } = await sb.from("activities").select("*").order("created_at", { ascending: false });
    setActivities((data as Activity[]) || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta actividad y todas sus entregas?")) return;
    const sb = getSupabaseClient();
    await sb.from("submissions").delete().eq("activity_id", id);
    await sb.from("rubric_criteria").delete().eq("activity_id", id);
    await sb.from("questions").delete().eq("activity_id", id);
    await sb.from("activities").delete().eq("id", id);
    fetchActivities();
  };

  const handleDuplicate = async (activity: Activity) => {
    const group = prompt(
      `Duplicar "${activity.name}"\n\nIngresa el nombre del grupo para la copia (ej: 10B, 11A):\n(Puedes dejarlo vacío)`,
      ""
    );
    if (group === null) return;
    const sb = getSupabaseClient();

    const insertData: Record<string, unknown> = {
      name: activity.name,
      subject: activity.subject,
      description: activity.description,
      deadline: activity.deadline,
      type: activity.type,
      access_code: generateCode(),
      guide_url: activity.guide_url,
    };

    const groupTrimmed = group.trim();
    if (groupTrimmed) insertData.group_name = groupTrimmed;

    const { data: newAct, error: insertErr } = await sb
      .from("activities")
      .insert(insertData)
      .select()
      .single();

    if (insertErr || !newAct) {
      alert(
        `Error al duplicar la actividad.\n\n` +
        (insertErr?.message ?? "Respuesta vacía de Supabase") +
        `\n\nSi la columna 'group_name' no existe, ejecuta en Supabase SQL Editor:\n` +
        `ALTER TABLE activities ADD COLUMN IF NOT EXISTS group_name TEXT;`
      );
      return;
    }

    const newId = (newAct as Activity).id;

    const { data: qs } = await sb.from("questions").select("*").eq("activity_id", activity.id).order("order_index");
    if (qs && (qs as Array<Record<string, unknown>>).length > 0) {
      await sb.from("questions").insert(
        (qs as Array<Record<string, unknown>>).map((q) => ({
          activity_id: newId,
          order_index: q.order_index,
          type: q.type,
          text: q.text,
          options: q.options,
          image_url: q.image_url,
        }))
      );
    }

    const { data: rs } = await sb.from("rubric_criteria").select("*").eq("activity_id", activity.id);
    if (rs && (rs as Array<Record<string, unknown>>).length > 0) {
      await sb.from("rubric_criteria").insert(
        (rs as Array<Record<string, unknown>>).map((r) => ({
          activity_id: newId,
          name: r.name,
          superior_desc: r.superior_desc,
          alto_desc: r.alto_desc,
          basico_desc: r.basico_desc,
          bajo_desc: r.bajo_desc,
        }))
      );
    }

    fetchActivities();
  };

  const allGroups = Array.from(new Set(activities.map((a) => a.group_name).filter(Boolean))) as string[];

  const filtered = activities.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.subject.toLowerCase().includes(search.toLowerCase());
    const matchGroup = filterGroup ? a.group_name === filterGroup : true;
    return matchSearch && matchGroup;
  });

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="bg-[#111827] border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {inst.logoUrl ? (
              <img
                src={inst.logoUrl}
                alt="Logo"
                className="w-8 h-8 object-contain rounded-lg bg-white/5"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
            <div className="hidden sm:block">
              <p className="font-bold text-sm leading-tight">{inst.name}</p>
              <p className="text-slate-500 text-xs">EduLab — Panel Docente</p>
            </div>
            <span className="sm:hidden font-bold text-lg">EduLab</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/settings")}
              className="text-slate-400 hover:text-white transition p-2 rounded-lg hover:bg-slate-700"
              title="Configuración"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <span className="text-slate-400 text-sm hidden sm:block">{username}</span>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-red-400 transition text-sm px-3 py-1.5 rounded-lg hover:bg-slate-700"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Mis Actividades</h1>
            <p className="text-slate-400 text-sm mt-1">{activities.length} actividad(es) creadas</p>
          </div>
          <button
            onClick={() => { setEditingActivity(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg font-medium transition active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Actividad
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o materia..."
            className="flex-1 min-w-52 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          {allGroups.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterGroup("")}
                className={cn(
                  "px-3 py-2 text-xs rounded-lg font-medium transition",
                  filterGroup === ""
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white border border-slate-600"
                )}
              >
                Todos
              </button>
              {allGroups.map((g) => (
                <button
                  key={g}
                  onClick={() => setFilterGroup(g === filterGroup ? "" : g)}
                  className={cn(
                    "px-3 py-2 text-xs rounded-lg font-medium font-mono transition",
                    filterGroup === g
                      ? "bg-amber-600 text-white"
                      : "bg-slate-800 text-amber-400 border border-slate-600 hover:border-amber-500"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-slate-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-slate-300 font-medium mb-1">Sin actividades</h3>
            <p className="text-slate-500 text-sm">Crea tu primera actividad para comenzar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onEdit={() => { setEditingActivity(activity); setShowForm(true); }}
                onDelete={() => handleDelete(activity.id)}
                onGrades={() => navigate(`/admin/activity/${activity.id}/grades`)}
                onDuplicate={() => handleDuplicate(activity)}
              />
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <ActivityFormModal
          activity={editingActivity}
          onClose={() => { setShowForm(false); setEditingActivity(null); }}
          onSaved={() => { setShowForm(false); setEditingActivity(null); fetchActivities(); }}
        />
      )}
    </div>
  );
}
