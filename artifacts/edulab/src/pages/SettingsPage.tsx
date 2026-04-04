import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

function getInstitution(): { name: string; logoUrl: string; address: string; city: string } {
  try {
    return JSON.parse(localStorage.getItem("edulab_institution") ?? "{}");
  } catch {
    return { name: "", logoUrl: "", address: "", city: "" };
  }
}

export function getInstitutionInfo() {
  const saved = getInstitution();
  return {
    name: saved.name || "IE San Francisco de Asís",
    logoUrl: saved.logoUrl || "",
    address: saved.address || "",
    city: saved.city || "",
  };
}

export default function SettingsPage() {
  const { username, changeCredentials } = useAuth();
  const [, navigate] = useLocation();
  const [newUsername, setNewUsername] = useState(username);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const inst = getInstitution();
  const [instName, setInstName] = useState(inst.name || "IE San Francisco de Asís");
  const [instLogoUrl, setInstLogoUrl] = useState(inst.logoUrl || "");
  const [instAddress, setInstAddress] = useState(inst.address || "");
  const [instCity, setInstCity] = useState(inst.city || "");
  const [instSaved, setInstSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword && newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!newUsername.trim()) {
      setError("El nombre de usuario no puede estar vacío.");
      return;
    }
    changeCredentials(newUsername.trim(), newPassword || "1234");
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleInstSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("edulab_institution", JSON.stringify({
      name: instName.trim(),
      logoUrl: instLogoUrl.trim(),
      address: instAddress.trim(),
      city: instCity.trim(),
    }));
    setInstSaved(true);
    setTimeout(() => setInstSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="bg-[#111827] border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="text-slate-400 hover:text-white transition p-2 rounded-lg hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="font-semibold">Configuración</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-[#111827] border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold">Institución Educativa</h2>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Esta información aparecerá en los encabezados del sistema y en los reportes PDF.
          </p>

          <form onSubmit={handleInstSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Nombre de la institución
              </label>
              <input
                type="text"
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="IE San Francisco de Asís"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                URL del logo (imagen)
              </label>
              <input
                type="url"
                value={instLogoUrl}
                onChange={(e) => setInstLogoUrl(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="https://tu-escuela.edu.co/logo.png"
              />
              {instLogoUrl && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={instLogoUrl}
                    alt="Logo"
                    className="w-12 h-12 object-contain rounded-lg bg-slate-700 p-1"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="text-xs text-slate-400">Vista previa del logo</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Dirección</label>
                <input
                  type="text"
                  value={instAddress}
                  onChange={(e) => setInstAddress(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Calle 10 # 5-20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Ciudad</label>
                <input
                  type="text"
                  value={instCity}
                  onChange={(e) => setInstCity(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Ej: Bogotá, Colombia"
                />
              </div>
            </div>

            {instSaved && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5 text-emerald-400 text-sm">
                Información de la institución guardada.
              </div>
            )}

            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded-lg font-medium transition active:scale-95 text-sm"
            >
              Guardar institución
            </button>
          </form>
        </div>

        <div className="bg-[#111827] border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold">Credenciales de acceso</h2>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Cambia el usuario y contraseña del panel docente.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Nombre de usuario
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Dejar vacío para mantener la actual"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}
            {saved && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5 text-emerald-400 text-sm">
                Credenciales actualizadas correctamente.
              </div>
            )}

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition active:scale-95 text-sm"
            >
              Guardar cambios
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
