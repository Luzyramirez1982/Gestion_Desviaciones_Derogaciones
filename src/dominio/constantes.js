// Listas y textos fijos del procedimiento. Son los mismos que ya tenía la app.
export const STAGES = ["Solicitud", "Evaluación y Aprobación", "Cierre"];
export const STAGE_SOLICITUD = 0, STAGE_EVAL = 1, STAGE_APROBACION = 1, STAGE_CIERRE = 2;
export const MODELO_REGISTRO = 4;
export const STAGE_ROLE = ["Responsable del proceso", "Aprobador autorizado", "Responsable del proceso que hizo la solicitud"];

export const AREA_SST = "Seguridad y Salud en el Trabajo";
export const DEFAULT_AREAS = [
  "Ingeniería Automatización y Control", "Ingeniería de Software", "Ingeniería mecánica", "Calidad Producto",
  "Dirección de Operaciones", "Producción", "Logística y Almacén", AREA_SST,
];

export const TIPOS_GESTION = ["Desviación", "Derogación"];
export const CRITICIDADES = ["Menor", "Mayor", "Crítica"];
export const CRITICIDADES_DESVIACION = ["Menor", "Mayor"];
export const LINEAS_NEGOCIO = ["Cartón", "Aeropuerto", "Logística"];

export const ROLES = ["Administrador", "Responsable del proceso", "Aprobador autorizado"];

export const FIRMA_SLOTS = [
  {key: "sol",    stage: 0,    rol: "Responsable del proceso", label: "1 · Solicitud — Responsable del proceso"},
  {key: "aprob",  stage: 1,    rol: "Aprobador autorizado",    label: "2 · Evaluación y Aprobación — Aprobador autorizado"},
  {key: "cierre", stage: 2,    rol: "Responsable del proceso", label: "3 · Cierre — Responsable del proceso que hizo la solicitud"},
  {key: "admin",  stage: null, rol: "Administrador",           label: "Visto bueno del Administrador (opcional)"},
];

export const MAX_FILE_MB = 5;
export const MAX_FILES_BATCH = 10;

export const D8_FIELDS = [
  {key: "d1", label: "D1 · Equipo", hint: "Quién conforma el equipo responsable del análisis."},
  {key: "d2", label: "D2 · Descripción del problema (herramienta 5W2H)", hint: "Síntesis del problema (opcional): resuma en una frase lo descrito con el 5W2H."},
  {key: "d3", label: "D3 · Acciones de contención", hint: "Observaciones adicionales sobre la contención (opcional)."},
  {key: "d4", label: "D4 · Causa raíz (herramienta 5 Porqués)", hint: "Causa raíz identificada: conclusión a la que llevan los porqués."},
  {key: "d5", label: "D5 · Acciones correctivas permanentes", hint: "Observaciones adicionales sobre las acciones correctivas (opcional)."},
  {key: "d6", label: "D6 · Implementación y validación", hint: "Cómo y cuándo se implementaron y verificaron."},
  {key: "d7", label: "D7 · Acciones preventivas", hint: "Cómo se evita que se repita en otros procesos o líneas."},
  {key: "d8", label: "D8 · Cierre y reconocimiento", hint: "Cierre formal y reconocimiento del equipo."},
];

export const W2H_FIELDS = [
  {key: "what",    label: "What",     pregunta: "¿Qué ocurrió?"},
  {key: "where",   label: "Where",    pregunta: "¿Dónde?"},
  {key: "when",    label: "When",     pregunta: "¿Cuándo?"},
  {key: "who",     label: "Who",      pregunta: "¿Quién o qué está involucrado?"},
  {key: "why",     label: "Why",      pregunta: "¿Por qué es importante?"},
  {key: "how",     label: "How",      pregunta: "¿Cómo se manifiesta?"},
  {key: "howMuch", label: "How much", pregunta: "¿Cuánto representa?"},
];

export const WHYS_COUNT = 5, WHYS_REQUIRED = 3;

export const ACT_TABLES = {
  d3: {prop: "contencion", titulo: "Acciones de contención", cols: [
    {key: "accion",       label: "Acción de contención", ph: "Ej. Separar e identificar el lote afectado"},
    {key: "puntoControl", label: "Punto de control",     ph: "Ej. Inspección 100 % en estación 3"},
    {key: "fecha",        label: "Fecha de realización", type: "date"},
    {key: "responsable",  label: "Responsable",          ph: "Nombre", list: true},
  ]},
  d5: {prop: "correctivas", titulo: "Acciones correctivas permanentes", cols: [
    {key: "causa",        label: "Causa",                ph: "Causa raíz que se ataca (de D4)"},
    {key: "accion",       label: "Acción correctiva",    ph: "Ej. Incluir la plantilla en el plan de mantenimiento"},
    {key: "fecha",        label: "Fecha de realización", type: "date"},
    {key: "responsable",  label: "Responsable",          ph: "Nombre", list: true},
  ]},
};
