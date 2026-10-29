// Tipos de desviación o derogación con los que arranca una base nueva (los mismos de la versión 1).
// El Administrador los puede cambiar después desde la pantalla «Tipos de desviación o derogación».
import { AREA_SST } from "./constantes.js";
import { SST_PELIGROS } from "./gtc45.js";

let n = 0;   // el identificador no puede repetirse entre áreas
const tipo = (area, nombres) => nombres.map(nombre => ({id: `t-base-${++n}`, area, nombre, desc: ""}));

export const TIPOS_POR_DEFECTO = [
  ...tipo("Ingeniería Automatización y Control", ["Deriva / falla de calibración", "Error de PLC / lógica de control", "Pérdida de comunicación de red", "Retardo / falla en actuador o sensor"]),
  ...tipo("Ingeniería de Software", ["Bug de software", "Error de configuración / parametrización", "Falla de integración entre sistemas", "Pérdida o corrupción de datos"]),
  ...tipo("Ingeniería mecánica", ["Incompatibilidad de materiales", "Error en plano / tolerancia", "Falta de robustez", "Requisito normativo no considerado"]),
  ...tipo("Calidad Producto", ["Fuera de especificación (OOS)", "Defecto estético / presentación", "Falla funcional", "Contaminación / impurezas"]),
  ...tipo("Dirección de Operaciones", ["Cambio de método o secuencia de trabajo", "Incumplimiento de procedimiento operativo", "Recurso, equipo o personal no disponible", "Intervención de equipo fuera de ciclo"]),
  ...tipo("Producción", ["Desviación de parámetro (torque, presión, consumible)", "Error de operación / incumplimiento de POE", "Falla mecánica / parada no programada", "Problema con materia prima"]),
  ...SST_PELIGROS.map(p => ({id: `t-base-${++n}`, area: AREA_SST, nombre: p.nombre, desc: p.desc})),
  ...tipo("Logística y Almacén", ["Almacenamiento fuera de condición", "Error de despacho / embalaje", "Material no conforme recibido", "Manipulación de cargas / equipos de izaje"]),
];

