import { ACT_TABLES, D8_FIELDS, W2H_FIELDS, WHYS_REQUIRED } from "./constantes.js";

export const emptyActRow = (kind) => ACT_TABLES[kind].cols.reduce((o, c) => (o[c.key] = "", o), {});
export const emptyW2H = () => W2H_FIELDS.reduce((o, f) => (o[f.key] = "", o), {});
export const emptyD8 = () => ({
  d1: "", d2: "", d3: "", d4: "", d5: "", d6: "", d7: "", d8: "",
  w2h: emptyW2H(), whys: ["", "", "", "", ""],
  contencion: [emptyActRow("d3")], correctivas: [emptyActRow("d5")],
});

// Dice qué le falta al reporte 8D. Si la lista sale vacía, el 8D está completo.
// D2: las 7 preguntas. D4: los 3 primeros porqués. D3 y D5: al menos una fila y ninguna a medias.
export function d8Faltantes(d8){
  const falta = [];
  const t = v => String(v || "").trim().length > 0;
  ["d1", "d4", "d6", "d7", "d8"].forEach(k => { if(!t(d8[k])) falta.push(D8_FIELDS.find(f => f.key === k).label.split(" (")[0]); });
  const w = d8.w2h || {};
  const w2hFalt = W2H_FIELDS.filter(f => !t(w[f.key])).map(f => f.label);
  if(w2hFalt.length) falta.push("D2 · 5W2H (" + w2hFalt.join(", ") + ")");
  const whys = d8.whys || [];
  const whyFalt = [];
  for(let i = 0; i < WHYS_REQUIRED; i++){ if(!t(whys[i])) whyFalt.push("Porqué " + (i + 1)); }
  if(whyFalt.length) falta.push("D4 · 5 Porqués (" + whyFalt.join(", ") + ")");
  ["d3", "d5"].forEach(kind => {
    const cfg = ACT_TABLES[kind], nom = kind.toUpperCase() + " · " + cfg.titulo;
    const filas = (d8[cfg.prop] || []).filter(r => cfg.cols.some(c => t(r[c.key])));
    if(!filas.length) falta.push(nom + " (registre al menos una)");
    filas.forEach((r, i) => {
      const fc = cfg.cols.filter(c => !t(r[c.key])).map(c => c.label);
      if(fc.length) falta.push(nom + " fila " + (i + 1) + " (" + fc.join(", ") + ")");
    });
  });
  return falta;
}

export function is8DComplete(rec){
  if(rec.tipoGestion !== "Derogación") return true;
  return d8Faltantes(rec.d8).length === 0;
}
