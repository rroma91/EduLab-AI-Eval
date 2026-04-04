import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { getSupabaseClient } from "@/lib/supabase";
import type { Activity, Question } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function StudentActivityPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [studentName, setStudentName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([""]);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});

  useEffect(() => {
    loadActivity();
  }, [id]);

  const loadActivity = async () => {
    const sb = getSupabaseClient();
    const [{ data: act }, { data: q }] = await Promise.all([
      sb.from("activities").select("*").eq("id", id).single(),
      sb.from("questions").select("*").eq("activity_id", id).order("order_index"),
    ]);
    setActivity(act as Activity);
    setQuestions((q as Question[]) || []);
    setLoading(false);
  };

  const updateAnswer = (qId: string, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const toggleCheckbox = (qId: string, option: string) => {
    const current = (answers[qId] as string[]) || [];
    if (current.includes(option)) {
      updateAnswer(qId, current.filter((o) => o !== option));
    } else {
      updateAnswer(qId, [...current, option]);
    }
  };

  const addGroupMember = () => setGroupMembers((prev) => [...prev, ""]);
  const removeGroupMember = (i: number) => setGroupMembers((prev) => prev.filter((_, idx) => idx !== i));
  const updateGroupMember = (i: number, value: string) => {
    setGroupMembers((prev) => prev.map((m, idx) => (idx === i ? value : m)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;
    setSubmitting(true);
    try {
      const sb = getSupabaseClient();
      await sb.from("submissions").insert({
        activity_id: id,
        student_name: studentName.trim(),
        group_members: activity?.type === "grupal" ? groupMembers.filter(Boolean) : null,
        answers,
        files: null,
        status: "pendiente",
        grade: null,
        percentage: null,
        feedback: null,
        ai_details: null,
      });
      setSubmitted(true);
    } catch {
      alert("Error al enviar. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-slate-400">Cargando actividad...</div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Actividad no encontrada</p>
          <button onClick={() => navigate("/student")} className="mt-4 text-indigo-400 hover:underline text-sm">
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Entrega exitosa</h2>
          <p className="text-slate-400">
            Tu actividad fue enviada correctamente. Tu docente la revisará pronto.
          </p>
          <button
            onClick={() => navigate("/student")}
            className="mt-6 text-indigo-400 hover:text-indigo-300 text-sm"
          >
            Acceder a otra actividad
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="bg-[#111827] border-b border-slate-700/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="font-semibold text-sm">EduLab</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-[#111827] border border-slate-700/50 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium mb-2 inline-block",
                activity.type === "grupal"
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-blue-500/20 text-blue-400"
              )}>
                {activity.type === "grupal" ? "Actividad Grupal" : "Actividad Individual"}
              </span>
              <h1 className="text-xl font-bold text-white">{activity.name}</h1>
              <p className="text-slate-400 text-sm">{activity.subject}</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm mt-3">{activity.description}</p>
          {activity.guide_url && (
            <a
              href={activity.guide_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 text-indigo-400 hover:text-indigo-300 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Ver guía PDF
            </a>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[#111827] border border-slate-700/50 rounded-xl p-6">
            <h2 className="font-semibold text-white mb-4">Identificación</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Tu nombre completo *
                </label>
                <input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Ej: Juan García"
                />
              </div>

              {activity.type === "grupal" && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Integrantes del grupo (adicionales)
                  </label>
                  {groupMembers.map((member, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input
                        value={member}
                        onChange={(e) => updateGroupMember(i, e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder={`Integrante ${i + 1}`}
                      />
                      {groupMembers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGroupMember(i)}
                          className="text-slate-500 hover:text-red-400 transition"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addGroupMember}
                    className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar integrante
                  </button>
                </div>
              )}
            </div>
          </div>

          {questions.map((q, i) => (
            <div key={q.id} className="bg-[#111827] border border-slate-700/50 rounded-xl p-6">
              <div className="mb-4">
                <span className="text-xs text-indigo-400 font-medium">Pregunta {i + 1}</span>
                <h3 className="text-white font-medium mt-1">{q.text}</h3>
              </div>

              {q.image_url && (
                <img
                  src={q.image_url}
                  alt="Imagen de apoyo"
                  className="w-full max-h-64 object-contain rounded-lg mb-4 bg-slate-800"
                />
              )}

              {q.type === "short_text" && (
                <input
                  value={(answers[`q_${i}`] as string) ?? ""}
                  onChange={(e) => updateAnswer(`q_${i}`, e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Tu respuesta..."
                />
              )}

              {q.type === "essay" && (
                <textarea
                  value={(answers[`q_${i}`] as string) ?? ""}
                  onChange={(e) => updateAnswer(`q_${i}`, e.target.value)}
                  rows={6}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                  placeholder="Escribe tu respuesta aquí..."
                />
              )}

              {q.type === "numeric" && (
                <input
                  type="number"
                  value={(answers[`q_${i}`] as number) ?? ""}
                  onChange={(e) => updateAnswer(`q_${i}`, parseFloat(e.target.value))}
                  className="w-full sm:w-48 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="0"
                />
              )}

              {q.type === "multiple_choice" && q.options && (
                <div className="space-y-2">
                  {q.options.map((option) => (
                    <label key={option} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name={`q_${i}`}
                        value={option}
                        checked={(answers[`q_${i}`] as string) === option}
                        onChange={() => updateAnswer(`q_${i}`, option)}
                        className="w-4 h-4 accent-indigo-500"
                      />
                      <span className="text-slate-300 text-sm group-hover:text-white transition">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "checkboxes" && q.options && (
                <div className="space-y-2">
                  {q.options.map((option) => {
                    const checked = ((answers[`q_${i}`] as string[]) || []).includes(option);
                    return (
                      <label key={option} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheckbox(`q_${i}`, option)}
                          className="w-4 h-4 accent-indigo-500"
                        />
                        <span className="text-slate-300 text-sm group-hover:text-white transition">{option}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === "file_upload" && (
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                  <svg className="w-8 h-8 text-slate-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-slate-400 text-sm">Adjunta tu archivo aquí</p>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) updateAnswer(`q_${i}`, file.name);
                    }}
                    className="mt-2 text-sm text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                </div>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting || !studentName.trim()}
            className={cn(
              "w-full py-3 px-4 rounded-xl font-semibold text-white transition-all",
              submitting || !studentName.trim()
                ? "bg-indigo-700/30 cursor-not-allowed text-slate-500"
                : "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]"
            )}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Enviando...
              </span>
            ) : (
              "Entregar actividad"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
