// Avisa al celular la noche anterior a cada partido (y la mañana del partido si se corre ese día).
import webpush from "web-push";
import { admin, cfg, hoyAR } from "./common.mjs";
const sb = admin(), { vapidPublic } = cfg();
if (!vapidPublic || !process.env.VAPID_PRIVATE_KEY) { console.error("Faltan las claves VAPID."); process.exit(1); }
webpush.setVapidDetails("https://gcovetta.github.io/vito-stats/", vapidPublic, process.env.VAPID_PRIVATE_KEY);

const cuando = process.argv.includes("--hoy") ? 0 : 1, dia = hoyAR(cuando);
const { data: rows, error } = await sb.from("docs").select("col,id,data").in("col", ["partidos", "push", "torneos"]);
if (error) throw error;
const tn = Object.fromEntries(rows.filter(r => r.col === "torneos").map(r => [r.id, r.data.nombre]));
const ps = rows.filter(r => r.col === "partidos" && r.data.fecha === dia && r.data.gf == null && r.data.gc == null);
const subs = rows.filter(r => r.col === "push");
console.log(`${dia}: ${ps.length} partido(s), ${subs.length} dispositivo(s).`);
for (const { data: p } of ps) {
  const payload = JSON.stringify({
    title: `${cuando ? "Mañana" : "Hoy"} juega ${p.club}`,
    body: `vs ${p.rival} · ${p.visitante ? "de visitante" : "de local"}${p.hora ? " · " + p.hora + " hs" : ""}${p.fechaN ? " · Fecha " + p.fechaN : ""}${tn[p.torneoId] ? "\n" + tn[p.torneoId] : ""}`,
    url: "./#inicio",
  });
  for (const s of subs) {
    try { await webpush.sendNotification(s.data.sub, payload, { TTL: 12 * 3600 }); }
    catch (e) {
      console.log("No se pudo enviar a un dispositivo:", e.statusCode || e.message);
      if (e.statusCode === 404 || e.statusCode === 410) await sb.from("docs").delete().eq("col", "push").eq("id", s.id); // suscripción vencida
    }
  }
}
