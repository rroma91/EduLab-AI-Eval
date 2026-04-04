import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateCode(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function gradeColor(grade: number | null): string {
  if (grade === null) return "text-muted-foreground";
  if (grade >= 4.6) return "text-emerald-400";
  if (grade >= 4.0) return "text-blue-400";
  if (grade >= 3.0) return "text-yellow-400";
  return "text-red-400";
}

export function gradeLabel(grade: number | null): string {
  if (grade === null) return "Sin evaluar";
  if (grade >= 4.6) return "Superior";
  if (grade >= 4.0) return "Alto";
  if (grade >= 3.0) return "Básico";
  return "Bajo";
}
