import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { getSupabaseClient } from "@/lib/supabase";
import type { Activity, Submission, Question, RubricCriteria } from "@/lib/supabase";
import { evaluateSubmissionWithAI } from "@/lib/groq";
import { exportToExcel, exportToPDF } from "@/lib/export";
import { gradeColor, gradeLabel, cn } from "@/lib/utils";
import { useConfig } from "@/contexts/ConfigContext";
import ReactMarkdown from "react-markdown";

export default function GradesPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { config } = useConfig();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [criteria, setCriteria] = useState<RubricCriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);

  useEffect(() => {
    loadData();
    const sb = getSupabaseClient();
    const channel = sb
      .channel("submissions_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `activity_id=eq.${id}` }, () => {
        loadSubmissions();
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [id]);

  const loadData = async () => {
    const sb = getSupabaseClient();
    const [{ data: act }, { data: q }, { data: r }] = await Promise.all([
      sb.from("activities").select("*").eq("id", id).single(),
      sb.from("questions").select("*").eq("activity_id", id).order("order_index"),
      sb.from("rubric_criteria").select("*").eq("activity_id", id),
    ]);
    setActivity(act as Activity);
    setQuestions((q as Question[]) || []);
    setCriteria((r as RubricCriteria[]) || []);
    await loadSubmissions();
    setLoading(false);
  };

  const loadSubmissions = async () => {
    const sb = getSupabaseClient();
    const { data } = await sb
      .from("submissions")
      .select("*")
      .eq("activity_id", id)
      .order("submitted_at", { ascending: false });
    setSubmissions((data as Submission[]) || []);
  };

  const handleEvaluate = async (submission: Submission) => {
    if (criteria.length === 0) {
      alert("Esta actividad no tiene rúbrica de evaluación configurada.");
      return;
    }
    if (!config?.groqApiKey) {
      alert("No se encontró la API Key de Groq.");
      return;
    }
    setEvaluating(submission.id);
    try {
      const result = await evaluateSubmissionWithAI(
        submission.student_name,
        activity!.name,
        activity!.description,
        questions.map((q) => ({ text: q.text, type: q.type })),
        submission.answers,
        criteria,
        config.groqApiKey
      );

      const sb = getSupabaseClient();
      await sb.from("submissions").update({
        grade: result.grade,
        percentage: result.percentage,
        feedback: result.feedback,
        ai_details: result.criteria_scores,
        status: "evaluado",
      }).eq("id", submission.id);

      loadSubmissions();
    } catch {
      alert("Error al evaluar con IA. Verifica tu GROQ_API_KEY.");
    } finally {
      setEvaluating(null);
    }
  };

  const handleExportExcel = () => {
    if (!activity) return;
    exportToExcel(activity.name, submissions.map((s) => ({
      studentName: s.student_name,
      groupMembers: s.group_members ?? undefined,
      grade: s.grade,
      percentage: s.percentage,
      status: s.status,
    })));
  };

  const handleExportPDF = async () => {
    if (!activity) return;
    await exportToPDF(activity.name, activity.subject, submissions.map((s) => ({
      studentName: s.student_name,
      groupMembers: s.group_members ?? undefined,
      grade: s.grade,
      percentage: s.percentage,
      status: s.status,
      feedback: s.feedback ?? undefined,
    })));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-slate-400">Cargando calificaciones...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="bg-[#111827] border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="text-slate-400 hover:text-white transition p-2 rounded-lg hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{activity?.name}</h1>
            <p className="text-xs text-slate-400">{activity?.subject} — {submissions.length} entrega(s)</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {submissions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-slate-300 font-medium mb-1">Sin entregas</h3>
            <p className="text-slate-500 text-sm">
              Comparte el código{" "}
              <span className="font-mono text-indigo-400 font-bold">{activity?.access_code}</span>{" "}
              con tus estudiantes
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">Estudiante</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">Grupo</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">Entregado</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">Estado</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">Nota</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">%</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 text-white font-medium">{sub.student_name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {sub.group_members?.length ? sub.group_members.join(", ") : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(sub.submitted_at).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        sub.status === "evaluado"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      )}>
                        {sub.status === "evaluado" ? "Evaluado" : "Pendiente"}
                      </span>
                    </td>
                    <td className={cn("px-4 py-3 font-bold", gradeColor(sub.grade))}>
                      {sub.grade !== null ? sub.grade.toFixed(1) : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {sub.percentage !== null ? `${sub.percentage}%` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEvaluate(sub)}
                          disabled={!!evaluating}
                          className={cn(
                            "flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition",
                            evaluating === sub.id
                              ? "bg-purple-700/30 text-purple-400 cursor-not-allowed"
                              : "bg-purple-600 hover:bg-purple-500 text-white"
                          )}
                        >
                          {evaluating === sub.id ? (
                            <>
                              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Evaluando...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              IA
                            </>
                          )}
                        </button>
                        {sub.feedback && (
                          <button
                            onClick={() => setSelected(sub)}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                          >
                            Ver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-[#111827] border border-slate-700/50 rounded-2xl w-full max-w-2xl my-4 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <div>
                <h2 className="font-semibold text-white">{selected.student_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("font-bold text-lg", gradeColor(selected.grade))}>
                    {selected.grade?.toFixed(1)}
                  </span>
                  <span className="text-slate-400 text-sm">/ 5.0</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", gradeColor(selected.grade))}>
                    {gradeLabel(selected.grade)}
                  </span>
                  <span className="text-slate-400 text-sm">{selected.percentage}%</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{selected.feedback ?? ""}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
