import { useState } from "react";
import { useLocation } from "wouter";
import { getSupabaseClient } from "@/lib/supabase";
import type { Activity } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function StudentEntryPage() {
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const sb = getSupabaseClient();
      const { data, error: err } = await sb
        .from("activities")
        .select("*")
        .eq("access_code", code.toUpperCase().trim())
        .single();

      if (err || !data) {
        setError("Código de actividad no encontrado. Verifica e intenta de nuevo.");
        return;
      }

      const activity = data as Activity;
      navigate(`/student/activity/${activity.id}`);
    } catch {
      setError("Error de conexión. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">EduLab</h1>
          <p className="text-slate-400 mt-1">Plataforma de Evaluación Educativa</p>
        </div>

        <div className="bg-[#111827] border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-2">Acceder a una actividad</h2>
          <p className="text-slate-400 text-sm mb-6">
            Ingresa el código de 6 caracteres que te proporcionó tu docente.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Código de actividad
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-center text-2xl font-mono tracking-widest placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="ABC123"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className={cn(
                "w-full py-3 px-4 rounded-lg font-semibold text-white transition-all",
                loading || code.length < 6
                  ? "bg-indigo-700/30 cursor-not-allowed text-slate-500"
                  : "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]"
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Buscando...
                </span>
              ) : (
                "Acceder a la actividad"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-slate-500 text-xs text-center">
              ¿Eres docente?{" "}
              <a href="/" className="text-indigo-400 hover:text-indigo-300">
                Ir al panel administrativo
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
