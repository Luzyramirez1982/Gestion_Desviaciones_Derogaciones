// Fechas con la hora de Colombia.
// Antes la app usaba la hora de Londres y, pasadas las 7 p. m., mostraba la fecha del día siguiente.
export const ZONA = "America/Bogota";

const partes = (now) => {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  return Object.fromEntries(f.formatToParts(now).map(p => [p.type, p.value]));
};

// Fecha de hoy. Si se le da un número, suma o resta esos días.
export function todayISO(offsetDays = 0, now = new Date()){
  const p = partes(now);
  const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day + (offsetDays || 0)));
  return d.toISOString().slice(0, 10);
}

// Fecha y hora de ahora, para llenar el campo de fecha y hora del formulario.
export function nowLocal(now = new Date()){
  const p = partes(now);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function nowStamp(now = new Date()){
  return now.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: ZONA });
}

// Cuántos días faltan para una fecha. Si ya pasó, el número sale negativo.
export function daysUntil(dateStr, now = new Date()){
  if(!dateStr) return null;
  const [y, m, d] = todayISO(0, now).split("-").map(Number);
  const [ty, tm, td] = String(dateStr).split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86400000);
}
