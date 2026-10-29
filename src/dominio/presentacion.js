// Colores y textos de apoyo que se muestran en pantalla (los mismos de la versión 1).
export const STAGE_COLORS = [{bg: "#f1f5f9", fg: "#334155"}, {bg: "#ede9fe", fg: "#6d28d9"}, {bg: "#dcfce7", fg: "#15803d"}];
export const AREA_PALETTE = [
  {bg: "#e0f2fe", fg: "#0369a1"}, {bg: "#ede9fe", fg: "#6d28d9"}, {bg: "#fce7f3", fg: "#be185d"}, {bg: "#fef3c7", fg: "#92400e"},
  {bg: "#dbeafe", fg: "#1d4ed8"}, {bg: "#ccfbf1", fg: "#0f766e"}, {bg: "#ffedd5", fg: "#c2410c"}, {bg: "#f1f5f9", fg: "#334155"},
];
export const TIPO_GESTION_COLORS = {"Desviación": {bg: "#dbeafe", fg: "#1d4ed8"}, "Derogación": {bg: "#fee2e2", fg: "#b91c1c"}};
export const TIPO_GESTION_DESC = {
  "Desviación": "Autorización temporal que no elimina el requisito; exige controles, responsable y vigencia definidos para restablecer la condición normal.",
  "Derogación": "Deja sin efecto el cumplimiento de un requisito dentro de un alcance y periodo autorizados. Por su carácter excepcional, siempre se gestiona junto con un análisis 8D.",
};
export const CRITICIDAD_INFO = {"Menor": {bg: "#dcfce7", fg: "#15803d"}, "Mayor": {bg: "#fef3c7", fg: "#92400e"}, "Crítica": {bg: "#fee2e2", fg: "#b91c1c"}};
export const OTRO = "__otro__", OTRO_LABEL = "Otro (escribir)";

export const ROLE_DESC = {
  "Administrador": "Crea los usuarios con su rol y les comparte el acceso (enlace, usuario y contraseña temporal); gestiona áreas y tipos de desviación o derogación; consulta todos los registros; puede eliminar registros dejando huella (quién, cuándo y por qué) y restaurarlos; puede retroceder la etapa de Cierre a Evaluación para corregir y dar visto bueno opcional. No firma por los demás roles.",
  "Responsable del proceso": "Diligencia la solicitud (puede guardar borradores y terminarla después) y la firma. Hace seguimiento con el consecutivo y, una vez finalizada la actividad, cierra su solicitud con observaciones de cierre, cumplimiento de controles y firma. Consulta también las solicitudes de su área.",
  "Aprobador autorizado": "Etapa de Evaluación y Aprobación: registra el concepto de evaluación y las medidas de control, revisa o completa el 8D en derogaciones, y aprueba con su firma. También puede devolver la solicitud al Responsable del proceso para ajustes o rechazarla, con motivo.",
};
