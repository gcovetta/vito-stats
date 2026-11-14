// Lee la página pública del torneo en ADUES (como la vería cualquier visitante) y actualiza en Supabase:
//  - tabla de posiciones, puesto del equipo y de Vito en goleadores
//  - fecha, hora, condición y resultado de los partidos de La Martona
// Nunca toca los goles de Vito, los tipos de gol, los videos ni nada que cargues a mano.
import fs from "node:fs";
import { chromium } from "playwright";
import { parseStandings, parseScorers, parseFecha, norm } from "./adues-parse.mjs";
import { admin, hoyAR } from "./common.mjs";

const C = JSON.parse(fs.readFileSync(new URL("./sync.config.json", import.meta.url), "utf8"));
const DRY = process.argv.includes("--dry");
const sb = DRY ? null : admin();
const eq = norm(C.equipo);

const browser = await chromium.launch();
const page = await browser.newPage({ locale: "es-AR" });
const text = () => page.evaluate(() => (document.querySelector("main") || document.body).innerText);
const tab = async name => { await page.getByText(name, { exact: true }).first().click(); await page.waitForTimeout(2500); };

await page.goto(C.torneoUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.getByText("Tabla de Posiciones").first().waitFor({ timeout: 45000 });
await page.waitForTimeout(1500);
const zonas = parseStandings(await text());

await tab("Goleadores");
await page.getByText("Tabla de Goleadores").first().waitFor({ timeout: 20000 });
const goleadores = parseScorers(await text());

await tab("Fixture");
const nFechas = await page.evaluate(() => [...document.querySelectorAll("main button, main [role=tab]")].filter(b => /^Fecha \d+$/.test(b.innerText.trim())).length);
const fixture = [];
for (let n = 1; n <= nFechas; n++) {
  await tab("Fecha " + n);
  for (const m of parseFecha(await text(), C.anio)) {
    if (norm(m.local) === eq || norm(m.visita) === eq) fixture.push({ fechaN: n, ...m });
  }
}
await browser.close();

// ---- Controles: si algo no cierra, no se escribe nada
const zi = zonas.findIndex(z => z.filas.some(f => norm(f.eq) === eq));
const fail = msg => { console.error("::error::" + msg + " No se modificó ningún dato."); process.exit(1); };
if (zi < 0) fail(`No encontré a ${C.equipo} en la tabla de posiciones (¿cambió la página de ADUES?).`);
if (zonas.some(z => z.filas.length < 4)) fail("La tabla de posiciones vino incompleta.");
if (!fixture.length) fail(`No encontré partidos de ${C.equipo} en el fixture.`);
if (new Set(fixture.map(f => f.fechaN)).size !== fixture.length) fail("El fixture trajo fechas repetidas.");

const Z = zonas[zi], pos = Z.filas.findIndex(f => norm(f.eq) === eq) + 1, me = Z.filas[pos - 1], lider = Z.filas[0];
const vito = goleadores.find(g => norm(g.nombre).includes(norm(C.jugador)) && norm(g.equipo) === eq);
const top = goleadores[0];
const d = hoyAR(), dm = `${d.slice(8)}/${d.slice(5, 7)}`;
console.log(`Tabla: ${C.equipo} ${pos}° ${Z.zona} · ${me.pts} pts. Goleadores: ${vito ? vito.pos + "° con " + vito.goles : "Vito no figura"}. Partidos: ${fixture.length}.`);
console.log(JSON.stringify(fixture));
if (DRY) process.exit(0);

const get = async (col, id) => (await sb.from("docs").select("data").eq("col", col).eq("id", id).maybeSingle()).data?.data;
const put = async (col, id, data) => { const { error } = await sb.from("docs").upsert({ col, id, data }); if (error) throw error; };

// Torneo
const T = (await get("torneos", C.torneoDocId)) || { club: C.club, nombre: C.torneoNombre, goles: 0, temporada: C.anio, tipo: "oficial", orden: C.anio * 100 + 10 };
T.tabla = zonas; T.tablaAl = dm; T.posicion = `${pos}° ${Z.zona} · ${me.pts} pts`;
if (vito) T.goleo = `${vito.pos}° goleador del torneo`;
await put("torneos", C.torneoDocId, T);

// Partidos del equipo
const { data: rows } = await sb.from("docs").select("id,data").eq("col", "partidos");
const mine = (rows || []).filter(r => r.data.torneoId === C.torneoDocId);
let jug = { g: 0, e: 0, p: 0 }, prox = null;
for (const f of fixture.sort((a, b) => a.fechaN - b.fechaN)) {
  const local = norm(f.local) === eq, rival = local ? f.visita : f.local;
  const ex = mine.find(r => r.data.fechaN === f.fechaN);
  const p = ex ? { ...ex.data } : { club: C.club, torneoId: C.torneoDocId, fechaN: f.fechaN, rival, gf: null, gc: null, golesVito: null, tipos: [] };
  if (!ex || norm(p.rival) !== norm(rival)) p.rival = ex && norm(p.rival).startsWith(norm(rival)) ? p.rival : rival;
  if (f.fecha) p.fecha = f.fecha;
  if (f.hora) p.hora = f.hora;
  p.visitante = !local;
  if (f.gl != null && p.gf == null && p.gc == null) { p.gf = local ? f.gl : f.gv; p.gc = local ? f.gv : f.gl; }
  if (p.gf != null && p.gc != null) p.gf > p.gc ? jug.g++ : p.gf < p.gc ? jug.p++ : jug.e++;
  else if (!prox && p.fecha && p.fecha >= d) prox = p;
  if (!ex || JSON.stringify(ex.data) !== JSON.stringify(p)) await put("partidos", ex ? ex.id : `fx-adues-${String(f.fechaN).padStart(2, "0")}`, p);
}

// "Dónde compite hoy"
const A = (await get("perfil", "ahora")) || { comps: [] };
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const comp = {
  club: C.club, torneo: T.nombre, zona: Z.zona, pos, de: Z.filas.length, pts: me.pts, pj: me.pj,
  lider: lider.eq, liderPts: lider.pts, forma: `${me.g}G ${me.e}E ${me.p}P`,
  prox: prox ? `${DIAS[new Date(prox.fecha + "T12:00:00Z").getUTCDay()]} ${prox.fecha.slice(8)}/${prox.fecha.slice(5, 7)}${prox.hora ? " " + prox.hora : ""} · vs ${prox.rival} (${prox.visitante ? "visitante" : "local"})` : "Sin partidos programados",
  vito: vito
    ? { goles: T.goles || 0, pos: vito.pos, liderGoles: top.goles, liderEquipo: top.equipo, ...(vito.goles !== (T.goles || 0) ? { nota: `ADUES le cuenta ${vito.goles}` } : {}) }
    : { goles: T.goles || 0, nota: "No figura en la tabla de goleadores de ADUES" },
};
const i = (A.comps || []).findIndex(c => c.club === C.club);
A.comps = A.comps || []; i >= 0 ? (A.comps[i] = comp) : A.comps.unshift(comp);
A.actualizado = `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
await put("perfil", "ahora", A);
console.log("Listo: datos de ADUES actualizados.");
