import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { getInstitutionInfo } from "@/pages/SettingsPage";

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inst = getInstitutionInfo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 400));
    const ok = login(username, password);
    setLoading(false);
    if (ok) {
      navigate("/admin");
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            {inst.logoUrl ? (
              <img
                src={inst.logoUrl}
                alt="Logo IE"
                className="w-14 h-14 object-contain rounded-xl bg-white/5 p-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">{inst.name}</h1>
          <p className="text-indigo-400 font-semibold mt-1 text-sm">EduLab — Plataforma de Evaluación</p>
          {inst.city && <p className="text-slate-500 text-xs mt-0.5">{inst.city}</p>}
        </div>

        <div className="bg-[#111827] border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Iniciar sesión docente</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="admin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="••••"
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
              disabled={loading}
              className={cn(
                "w-full py-2.5 px-4 rounded-lg font-semibold text-white transition-all",
                loading
                  ? "bg-indigo-700/50 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]"
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verificando...
                </span>
              ) : (
                "Ingresar al panel"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-slate-500 text-xs text-center">
              ¿Eres estudiante?{" "}
              <a href="/student" className="text-indigo-400 hover:text-indigo-300">
                Accede con tu código de actividad
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
