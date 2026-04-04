interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  groqApiKey: string;
}

let cachedConfig: AppConfig | null = null;

export async function getConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;
  const base = import.meta.env.BASE_URL || "/";
  const apiBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const res = await fetch(`/api/config`);
  if (!res.ok) throw new Error("Failed to load app config");
  cachedConfig = await res.json();
  return cachedConfig!;
}
