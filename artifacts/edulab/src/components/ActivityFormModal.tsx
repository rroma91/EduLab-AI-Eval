import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Activity, Question, RubricCriteria } from "@/lib/supabase";
import { generateCode, cn } from "@/lib/utils";
import { useConfig } from "@/contexts/ConfigContext";

interface Props {
  activity: Activity | null;
  onClose: () => void;
  onSaved: () => void;
}

const STANDARD_CRITERIA = [
  {
    name: "Comprensión del tema",
    superior_desc: "Demuestra comprensión profunda y excepcional del tema, con análisis crítico y conexiones con otros conceptos.",
    alto_desc: "Comprende bien el tema y presenta ideas claras con algunos análisis propios.",
    basico_desc: "Muestra comprensión básica del tema con algunas imprecisiones o falta de profundidad.",
    bajo_desc: "Evidencia comprensión mínima o incorrecta del tema, con errores significativos.",
    weight: 25,
  },
  {
    name: "Argumentación y sustentación",
    superior_desc: "Argumentos sólidos, bien sustentados con evidencia, lógica impecable y fuentes confiables.",
    alto_desc: "Argumentos claros con buena sustentación, aunque algunos puntos requieren más evidencia.",
    basico_desc: "Argumentos básicos con sustentación limitada o parcialmente fundamentada.",
    bajo_desc: "Argumentos débiles, sin sustentación clara o con fallas lógicas evidentes.",
    weight: 25,
  },
  {
    name: "Organización y presentación",
    superior_desc: "Organización impecable, estructura clara, redacción fluida y sin errores gramaticales.",
    alto_desc: "Buena organización y presentación con errores menores de redacción.",
    basico_desc: "Organización básica con algunas dificultades en la presentación o redacción.",
    bajo_desc: "Desorganizado, con graves errores de presentación o redacción que dificultan la comprensión.",
    weight: 25,
  },
  {
    name: "Creatividad e innovación",
    superior_desc: "Propone ideas originales, perspectivas innovadoras y aporta valor adicional más allá de lo solicitado.",
    alto_desc: "Muestra creatividad en algunos aspectos con aportes propios interesantes.",
    basico_desc: "Presenta el trabajo de manera convencional con poca creatividad o aporte propio.",
    bajo_desc: "No muestra creatividad ni aportes propios, repite información sin elaboración.",
    weight: 25,
  },
];

const QUESTION_TYPES = [
  { value: "short_text", label: "Texto corto" },
  { value: "essay", label: "Ensayo (largo)" },
  { value: "multiple_choice", label: "Opción múltiple" },
  { value: "checkboxes", label: "Casillas (múltiple selección)" },
  { value: "numeric", label: "Numérica" },
  { value: "file_upload", label: "Subir archivo" },
];

type Tab = "info" | "questions" | "rubric";

export default function ActivityFormModal({ activity, onClose, onSaved }: Props) {
  const isEditing = !!activity;
  const { config } = useConfig();
  const [tab, setTab] = useState<Tab>("info");
  const [saving, setSaving] = useState(false);
  const [generatingRubric, setGeneratingRubric] = useState(false);

  const [name, setName] = useState(activity?.name ?? "");
  const [subject, setSubject] = useState(activity?.subject ?? "");
  const [description, setDescription] = useState(activity?.description ?? "");
  const [deadline, setDeadline] = useState(activity?.deadline?.slice(0, 10) ?? "");
  const [type, setType] = useState<"individual" | "grupal">(activity?.type ?? "individual");
  const [guideUrl, setGuideUrl] = useState(activity?.guide_url ?? "");

  const [questions, setQuestions] = useState<Partial<Question>[]>([]);
  const [criteria, setCriteria] = useState<Partial<RubricCriteria>[]>([]);

  useEffect(() => {
    if (activity) {
      loadExisting();
    } else {
      setQuestions([{ type: "short_text", text: "", options: null, image_url: null, order_index: 0 }]);
      setCriteria(STANDARD_CRITERIA.map((c) => ({ ...c })));
    }
  }, [activity]);

  const loadExisting = async () => {
    const sb = getSupabaseClient();
    const { data: q } = await sb
      .from("questions")
      .select("*")
      .eq("activity_id", activity!.id)
      .order("order_index");
    setQuestions((q as Question[]) || []);

    const { data: r } = await sb
      .from("rubric_criteria")
      .select("*")
      .eq("activity_id", activity!.id);
    setCriteria((r as RubricCriteria[]) || []);
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { type: "short_text", text: "", options: null, image_url: null, order_index: prev.length },
    ]);
  };

  const removeQuestion = (i: number) => {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateQuestion = (i: number, field: string, value: unknown) => {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, [field]: value } : q)));
  };

  const addCriteria = () => {
    setCriteria((prev) => [
      ...prev,
      { name: "", superior_desc: "", alto_desc: "", basico_desc: "", bajo_desc: "", weight: 25 },
    ]);
  };

  const removeCriteria = (i: number) => {
    setCriteria((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateCriteria = (i: number, field: string, value: unknown) => {
    setCriteria((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };

  const handleGenerateRubric = async () => {
    if (!name || !description) {
      alert("Completa el nombre y descripción de la actividad primero.");
      return;
    }
    if (!config?.groqApiKey) {
      alert("No se encontró la API Key de Groq.");
      return;
    }
    setGeneratingRubric(true);
    try {
      const { generateRubricWithAI } = await import("@/lib/groq");
      const generated = await generateRubricWithAI(name, description, config.groqApiKey);
      setCriteria(generated.map((g) => ({ ...g })));
    } catch {
      alert("Error al generar la rúbrica con IA. Verifica tu API key de Groq.");
    } finally {
      setGeneratingRubric(false);
    }
  };

  const handleSave = async () => {
    if (!name || !subject || !description || !deadline) {
      setTab("info");
      return alert("Completa todos los campos requeridos.");
    }
    setSaving(true);
    try {
      const sb = getSupabaseClient();
      let activityId = activity?.id;
      const activityData = {
        name,
        subject,
        description,
        deadline,
        type,
        guide_url: guideUrl || null,
        ...(isEditing ? {} : { access_code: generateCode() }),
      };

      if (isEditing) {
        await sb.from("activities").update(activityData).eq("id", activityId!);
        await sb.from("questions").delete().eq("activity_id", activityId!);
        await sb.from("rubric_criteria").delete().eq("activity_id", activityId!);
      } else {
        const { data } = await sb.from("activities").insert(activityData).select().single();
        activityId = (data as Activity).id;
      }

      if (questions.length > 0) {
        await sb.from("questions").insert(
          questions.map((q, i) => ({
            activity_id: activityId,
            order_index: i,
            type: q.type,
            text: q.text,
            options: q.options,
            image_url: q.image_url || null,
          }))
        );
      }

      if (criteria.length > 0) {
        await sb.from("rubric_criteria").insert(
          criteria.map((c) => ({
            activity_id: activityId,
            name: c.name,
            superior_desc: c.superior_desc,
            alto_desc: c.alto_desc,
            basico_desc: c.basico_desc,
            bajo_desc: c.bajo_desc,
            weight: c.weight,
          }))
        );
      }

      onSaved();
    } catch {
      alert("Error al guardar. Verifica la conexión con Supabase.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-[#111827] border border-slate-700/50 rounded-2xl w-full max-w-3xl my-4 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? "Editar Actividad" : "Nueva Actividad"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-slate-700/50">
          {(["info", "questions", "rubric"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition",
                tab === t
                  ? "text-indigo-400 border-b-2 border-indigo-400"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {t === "info" ? "Información" : t === "questions" ? "Preguntas" : "Rúbrica"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: Ensayo sobre el cambio climático"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Materia *</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: Ciencias Naturales"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Descripción *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Describe los objetivos y requisitos de la actividad..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Fecha límite *</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as "individual" | "grupal")}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="individual">Individual</option>
                    <option value="grupal">Grupal</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  URL Guía PDF (opcional)
                </label>
                <input
                  value={guideUrl}
                  onChange={(e) => setGuideUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {tab === "questions" && (
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400">Pregunta {i + 1}</span>
                    <button
                      onClick={() => removeQuestion(i)}
                      className="text-slate-500 hover:text-red-400 transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(i, "type", e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {QUESTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <input
                      value={q.text}
                      onChange={(e) => updateQuestion(i, "text", e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Texto de la pregunta..."
                    />
                    <input
                      value={q.image_url ?? ""}
                      onChange={(e) => updateQuestion(i, "image_url", e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="URL de imagen de apoyo (opcional)"
                    />
                    {(q.type === "multiple_choice" || q.type === "checkboxes") && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Opciones (una por línea)</p>
                        <textarea
                          value={(q.options ?? []).join("\n")}
                          onChange={(e) => updateQuestion(i, "options", e.target.value.split("\n").filter(Boolean))}
                          rows={3}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                          placeholder={"Opción 1\nOpción 2\nOpción 3"}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={addQuestion}
                className="w-full border border-dashed border-slate-600 hover:border-indigo-500 rounded-xl py-3 text-sm text-slate-400 hover:text-indigo-400 transition"
              >
                + Agregar pregunta
              </button>
            </div>
          )}

          {tab === "rubric" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  onClick={handleGenerateRubric}
                  disabled={generatingRubric}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition",
                    generatingRubric
                      ? "bg-purple-700/30 text-purple-400 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-500 text-white"
                  )}
                >
                  {generatingRubric ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generando con IA...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      IA: Generar Rúbrica
                    </>
                  )}
                </button>
                <button
                  onClick={() => setCriteria(STANDARD_CRITERIA.map((c) => ({ ...c })))}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white transition"
                >
                  Pre-cargar estándar
                </button>
              </div>

              {criteria.map((c, i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      value={c.name}
                      onChange={(e) => updateCriteria(i, "name", e.target.value)}
                      className="bg-transparent text-white font-medium text-sm focus:outline-none border-b border-transparent focus:border-indigo-500 flex-1 mr-4"
                      placeholder="Nombre del criterio..."
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={c.weight}
                        onChange={(e) => updateCriteria(i, "weight", Number(e.target.value))}
                        className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        min={1}
                        max={100}
                      />
                      <span className="text-slate-400 text-xs">%</span>
                      <button onClick={() => removeCriteria(i)} className="text-slate-500 hover:text-red-400 transition">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { key: "superior_desc", label: "Superior (4.6-5.0)", color: "text-emerald-400" },
                      { key: "alto_desc", label: "Alto (4.0-4.5)", color: "text-blue-400" },
                      { key: "basico_desc", label: "Básico (3.0-3.9)", color: "text-yellow-400" },
                      { key: "bajo_desc", label: "Bajo (1.0-2.9)", color: "text-red-400" },
                    ].map(({ key, label, color }) => (
                      <div key={key}>
                        <p className={cn("text-xs font-medium mb-0.5", color)}>{label}</p>
                        <textarea
                          value={(c as Record<string, unknown>)[key] as string ?? ""}
                          onChange={(e) => updateCriteria(i, key, e.target.value)}
                          rows={2}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                          placeholder={`Descripción nivel ${label}...`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={addCriteria}
                className="w-full border border-dashed border-slate-600 hover:border-indigo-500 rounded-xl py-3 text-sm text-slate-400 hover:text-indigo-400 transition"
              >
                + Agregar criterio
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-700/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-semibold text-white transition",
              saving ? "bg-indigo-700/50 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500"
            )}
          >
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear actividad"}
          </button>
        </div>
      </div>
    </div>
  );
}
