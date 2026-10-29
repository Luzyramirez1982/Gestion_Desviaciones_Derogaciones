// Datos de ejemplo INVENTADOS para el modo demostración. Nada de esto existe en producción:
// la app solo los usa cuando no hay una base de datos conectada.
import { DEFAULT_AREAS, AREA_SST } from "../dominio/constantes.js";
import { SST_PELIGROS } from "../dominio/gtc45.js";
import { emptyD8 } from "../dominio/d8.js";
import { todayISO } from "../util/fechas.js";

export const CLAVE_DEMO = "Demo2026";

export const PERSONAS_DEMO = [
  {id: "u-admin", nombre: "Ana Administradora", correo: "admin@ejemplo.test", rol: "Administrador", area: ""},
  {id: "u-calidad", nombre: "Camilo Calidad", correo: "calidad@ejemplo.test", rol: "Responsable del proceso", area: "Calidad Producto"},
  {id: "u-prod", nombre: "Paula Producción", correo: "produccion@ejemplo.test", rol: "Responsable del proceso", area: "Producción"},
  {id: "u-sst", nombre: "Sara SST", correo: "sst@ejemplo.test", rol: "Responsable del proceso", area: AREA_SST},
  {id: "u-aprob", nombre: "Alberto Aprobador", correo: "aprobador@ejemplo.test", rol: "Aprobador autorizado", area: ""},
];

const tipo = (area, nombres) => nombres.map((nombre, i) => ({id: `t-${area.slice(0, 3)}-${i}`, area, nombre, desc: ""}));

export const TIPOS_DEMO = [
  ...tipo("Ingeniería Automatización y Control", ["Deriva / falla de calibración", "Error de PLC / lógica de control", "Pérdida de comunicación de red", "Retardo / falla en actuador o sensor"]),
  ...tipo("Ingeniería de Software", ["Bug de software", "Error de configuración / parametrización", "Falla de integración entre sistemas", "Pérdida o corrupción de datos"]),
  ...tipo("Ingeniería mecánica", ["Incompatibilidad de materiales", "Error en plano / tolerancia", "Falta de robustez", "Requisito normativo no considerado"]),
  ...tipo("Calidad Producto", ["Fuera de especificación (OOS)", "Defecto estético / presentación", "Falla funcional", "Contaminación / impurezas"]),
  ...tipo("Dirección de Operaciones", ["Cambio de método o secuencia de trabajo", "Incumplimiento de procedimiento operativo", "Recurso, equipo o personal no disponible", "Intervención de equipo fuera de ciclo"]),
  ...tipo("Producción", ["Desviación de parámetro (torque, presión, consumible)", "Error de operación / incumplimiento de POE", "Falla mecánica / parada no programada", "Problema con materia prima"]),
  ...SST_PELIGROS.map((p, i) => ({id: `t-sst-${i}`, area: AREA_SST, nombre: p.nombre, desc: p.desc})),
  ...tipo("Logística y Almacén", ["Almacenamiento fuera de condición", "Error de despacho / embalaje", "Material no conforme recibido", "Manipulación de cargas / equipos de izaje"]),
];

export const AREAS_DEMO = DEFAULT_AREAS.map((nombre, orden) => ({nombre, orden}));

const base = (o) => ({
  tipoGestion: "Desviación", criticidad: "Menor", recurrente: false, cargo: "Analista", areaSolicitante: "", procesoSolicitante: "Proceso de ejemplo",
  ot: "OT-0000", proyecto: "Proyecto de ejemplo", lineaNegocio: "Logística", requisitoIncumplido: "Procedimiento de ejemplo",
  equipoInvolucrado: "Equipo de ejemplo", tareaDescripcion: "Tarea de ejemplo", motivoDesviacion: "Motivo de ejemplo",
  consecuenciasPotenciales: "Consecuencia de ejemplo", controlesCompensatorios: "",
  vigenciaInicio: todayISO(-2), vigenciaFin: todayISO(10), ...o,
});

// Tres solicitudes de ejemplo: una en evaluación, una en cierre y una derogación en evaluación.
export function registrosDemo(){
  const firma = (nombre, rol, usuarioId) => ({nombre, rol, usuarioId, ruta: "", fecha: new Date().toISOString()});
  const bit = (etapa, rol, usuario, comentario) => ({etapa, rol, usuario, fecha: todayISO(), comentario});
  const d8 = emptyD8();
  return [
    {...base({area: "Calidad Producto", tipoEspecifico: "Fuera de especificación (OOS)", reportadoPor: "Camilo Calidad"}),
      id: "MTC-001", stage: 1, borrador: false, devuelta: false, cerrado: false, resultado: "", reportadoPorId: "u-calidad", version: 1,
      firmas: {sol: firma("Camilo Calidad", "Responsable del proceso", "u-calidad")}, adjuntos: [],
      bitacora: [bit("Solicitud", "Responsable del proceso", "Camilo Calidad", "Solicitud creada y firmada.")]},
    {...base({area: "Producción", tipoEspecifico: "Falla mecánica / parada no programada", reportadoPor: "Paula Producción", criticidad: "Mayor",
        controlesCompensatorios: "Inspección visual cada hora.", conceptoEvaluacion: "Se autoriza con controles."}),
      id: "MTC-002", stage: 2, borrador: false, devuelta: false, cerrado: false, resultado: "", reportadoPorId: "u-prod", version: 3,
      firmas: {sol: firma("Paula Producción", "Responsable del proceso", "u-prod"), aprob: firma("Alberto Aprobador", "Aprobador autorizado", "u-aprob")}, adjuntos: [],
      bitacora: [bit("Solicitud", "Responsable del proceso", "Paula Producción", "Solicitud creada y firmada."),
        bit("Evaluación y Aprobación", "Aprobador autorizado", "Alberto Aprobador", "Evaluó la solicitud, la aprobó y firmó.")]},
    {...base({area: AREA_SST, tipoGestion: "Derogación", alcanceDerogacion: "Temporal", criticidad: "Crítica", tipoEspecifico: "Físico", reportadoPor: "Sara SST", d8, d8Started: true}),
      id: "MTC-003", stage: 1, borrador: false, devuelta: false, cerrado: false, resultado: "", reportadoPorId: "u-sst", version: 1,
      firmas: {sol: firma("Sara SST", "Responsable del proceso", "u-sst")}, adjuntos: [],
      bitacora: [bit("Solicitud", "Responsable del proceso", "Sara SST", "Solicitud creada y firmada.")]},
  ];
}
