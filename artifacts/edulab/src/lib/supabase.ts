import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function initSupabase(url: string, key: string): SupabaseClient {
  if (_client) return _client;
  _client = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return _client;
}

export function getSupabaseClient(): SupabaseClient {
  if (!_client) throw new Error("Supabase not initialized");
  return _client;
}

export interface Activity {
  id: string;
  name: string;
  subject: string;
  description: string;
  deadline: string;
  type: "individual" | "grupal";
  access_code: string;
  guide_url: string | null;
  group_name: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  activity_id: string;
  order_index: number;
  type: "short_text" | "essay" | "multiple_choice" | "checkboxes" | "numeric" | "file_upload";
  text: string;
  options: string[] | null;
  image_url: string | null;
  created_at: string;
}

export interface RubricCriteria {
  id: string;
  activity_id: string;
  name: string;
  superior_desc: string;
  alto_desc: string;
  basico_desc: string;
  bajo_desc: string;
  created_at: string;
}

export interface Submission {
  id: string;
  activity_id: string;
  student_name: string;
  group_members: string[] | null;
  answers: Record<string, string | string[] | number>;
  files: string[] | null;
  status: "pendiente" | "evaluado";
  grade: number | null;
  percentage: number | null;
  feedback: string | null;
  ai_details: Record<string, unknown> | null;
  submitted_at: string;
}
