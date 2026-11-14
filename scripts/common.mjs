import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
export function cfg() {
  const c = fs.readFileSync(new URL("../config.js", import.meta.url), "utf8");
  const pick = k => (c.match(new RegExp(k + '\\s*:\\s*"([^"]+)"')) || [])[1];
  return { url: pick("SUPABASE_URL"), vapidPublic: pick("VAPID_PUBLIC_KEY") };
}
export function admin() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) { console.error("Falta el secreto SUPABASE_SERVICE_KEY en GitHub (Settings → Secrets and variables → Actions)."); process.exit(1); }
  return createClient(cfg().url, key, { auth: { persistSession: false } });
}
// Fecha de hoy en Argentina (YYYY-MM-DD), con desplazamiento opcional en días
export const hoyAR = (plus = 0) => new Date(Date.now() - 3 * 3600e3 + plus * 86400e3).toISOString().slice(0, 10);
