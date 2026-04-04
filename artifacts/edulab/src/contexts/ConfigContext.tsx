import React, { createContext, useContext, useState, useEffect } from "react";
import { initSupabase } from "@/lib/supabase";

interface Config {
  supabaseUrl: string;
  supabaseAnonKey: string;
  groqApiKey: string;
}

interface ConfigContextType {
  config: Config | null;
  ready: boolean;
  error: string | null;
}

const ConfigContext = createContext<ConfigContextType>({ config: null, ready: false, error: null });

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg: Config) => {
        if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
          setError("Configuración de Supabase no encontrada. Verifica las variables de entorno.");
          return;
        }
        initSupabase(cfg.supabaseUrl, cfg.supabaseAnonKey);
        setConfig(cfg);
        setReady(true);
      })
      .catch(() => {
        setError("Error al cargar la configuración del servidor.");
      });
  }, []);

  return (
    <ConfigContext.Provider value={{ config, ready, error }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}

export function useGroqKey(): string {
  const { config } = useContext(ConfigContext);
  return config?.groqApiKey ?? "";
}
