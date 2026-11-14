// Funciones puras que leen el texto visible de la página pública de ADUES.
// Están separadas para poder probarlas sin abrir el sitio.
export const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/\s*-\s*octava$/, "").replace(/[."]/g, "").replace(/\s+/g, " ").trim();

export function parseStandings(text) {
  const zones = [];
  const parts = text.split(/\n\s*(ZONA\s+\d+|GENERAL)\s*\n/i);
  for (let i = 1; i < parts.length; i += 2) {
    const filas = [];
    const re = /(?:^|\n)(\d+)\t\s*\n?\s*([^\t\n]+?)\s*\n?\t(\d+)\t(\d+)\t(\d+)\t(\d+)\t(\d+)\t(\d+)\t(\d+)\t[+-]?\d+/g;
    let m;
    while ((m = re.exec(parts[i + 1]))) {
      filas.push({ eq: m[2].trim().replace(/\s*-\s*Octava$/i, ""), pts: +m[3], pj: +m[4], g: +m[5], e: +m[6], p: +m[7], gf: +m[8], gc: +m[9] });
    }
    if (filas.length) zones.push({ zona: parts[i].trim().replace(/^zona/i, "Zona").replace(/^general/i, "General"), filas });
  }
  return zones;
}

export function parseScorers(text) {
  const i = text.indexOf("Tabla de Goleadores");
  if (i < 0) return [];
  const end = text.indexOf("\nADUES\n", i);
  const tok = text.slice(i + 19, end < 0 ? undefined : end).split("\n").map(s => s.trim()).filter(Boolean);
  const out = [];
  let k = 0;
  while (k < tok.length) {
    if (!/^\d+$/.test(tok[k])) { k++; continue; }
    let j = k + 1;
    if (/^[A-ZÁÉÍÓÚÑ]{1,3}$/.test(tok[j] || "") && !/^\d+$/.test(tok[j + 3] || "x")) j++; // iniciales del avatar
    if (/^[A-ZÁÉÍÓÚÑ]{1,3}$/.test(tok[j] || "") && /^\d+$/.test(tok[j + 3] || "")) j++;
    const nombre = tok[j], equipo = tok[j + 1], goles = tok[j + 2];
    if (nombre && equipo && /^\d+$/.test(goles || "")) { out.push({ pos: out.length + 1, nombre, equipo: equipo.replace(/\s*-\s*Octava$/i, ""), goles: +goles }); k = j + 3; }
    else k++;
  }
  return out;
}

const MES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9, set: 9, oct: 10, nov: 11, dic: 12 };
export function parseFecha(text, year) {
  const s = text.search(/\d+\s+partidos?\s*\n/);
  if (s < 0) return [];
  const end = text.indexOf("\nADUES\n", s);
  const L = text.slice(s, end < 0 ? undefined : end).split("\n").map(x => x.trim()).filter(Boolean).slice(1);
  const out = [];
  const isDate = x => /^(lun|mar|mi[eé]|jue|vie|s[aá]b|dom)[a-záé]*,?\s+\d+\s+[a-z]+\.?$/i.test(x) || /^a confirmar$/i.test(x);
  for (let k = 0; k + 3 < L.length + 0; ) {
    if (!isDate(L[k])) { k++; continue; }
    const [d, home, mid, away] = [L[k], L[k + 1], L[k + 2], L[k + 3]];
    if (!home || !mid || !away) break;
    const o = { local: home.replace(/\s*-\s*Octava$/i, ""), visita: away.replace(/\s*-\s*Octava$/i, "") };
    const dm = d.match(/(\d+)\s+([a-z]+)/i);
    if (dm && MES[dm[2].toLowerCase()]) o.fecha = `${year}-${String(MES[dm[2].toLowerCase()]).padStart(2, "0")}-${String(dm[1]).padStart(2, "0")}`;
    const sc = mid.match(/^(\d+)\s*[—–-]\s*(\d+)$/);
    const tm = mid.match(/^(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?$/i);
    if (sc) { o.gl = +sc[1]; o.gv = +sc[2]; }
    else if (tm) { let hh = +tm[1] % 12; if (tm[3].toLowerCase() === "p") hh += 12; o.hora = `${String(hh).padStart(2, "0")}:${tm[2]}`; }
    out.push(o); k += 4;
  }
  return out;
}
