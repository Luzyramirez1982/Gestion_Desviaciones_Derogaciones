// Textos de los correos que se preparan desde la aplicación (la persona los revisa y los envía desde su correo).
import { STAGES } from "./constantes.js";
import { isClosed, vigenciaTexto } from "./registro.js";

// Quién debe enterarse según la etapa: evaluación → Aprobadores; cierre → quien hizo la solicitud.
export function destinatariosEtapa(rec, perfiles){
  const activos = perfiles.filter(p => p.activo !== false);
  const dueno = activos.find(p => p.id === rec.reportadoPorId) || activos.find(p => p.nombre === rec.reportadoPor);
  let lista = rec.stage === 1 && !isClosed(rec) ? activos.filter(p => p.rol === "Aprobador autorizado") : [dueno];
  lista = lista.filter(Boolean);
  return lista.length ? lista : activos.filter(p => p.rol === "Administrador");
}

export function correoDeAviso(rec, perfiles){
  const para = destinatariosEtapa(rec, perfiles).map(p => p.correo).join(",");
  const accion = rec.resultado === "Rechazada" ? "fue rechazada" : isClosed(rec) ? "fue cerrada" : rec.devuelta ? "fue devuelta para ajustes"
    : rec.stage === 1 ? "requiere su evaluación y aprobación" : "está aprobada; ciérrela cuando finalice la actividad";
  const asunto = `${rec.tipoGestion} ${rec.id} — ${STAGES[rec.stage]} — ${rec.area}`;
  const lineas = [
    `La ${rec.tipoGestion.toLowerCase()} ${rec.id} ${accion}.`, "",
    `Código: ${rec.id}`, `Etapa: ${STAGES[rec.stage]}`, `Dirigida al área: ${rec.area}`, `Tipo específico: ${rec.tipoEspecifico || "-"}`,
    ...(rec.tipoGestion === "Derogación" ? [`Alcance: ${vigenciaTexto(rec)}`] : []),
    `OT: ${rec.ot || "-"}`, `Proyecto: ${rec.proyecto || "-"}`, `Criticidad: ${rec.criticidad}`,
    `Responsable del proceso: ${rec.reportadoPor} (${rec.cargo || "-"})`, "", "Motivo:", rec.motivoDesviacion || "-", "",
    "Ingrese al aplicativo Gestión de Desviaciones y Derogaciones MATEC para revisar el detalle completo.",
  ];
  return `mailto:${para}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(lineas.join("\n"))}`;
}

// Mensaje de bienvenida con el acceso. La contraseña temporal solo existe justo después de crear o restablecer la cuenta.
export function mensajeAcceso({ nombre, correo, clave, rol, area }, enlace, administrador){
  return [
    `Hola ${nombre},`, "",
    "Se creó su usuario en el aplicativo Gestión de Desviaciones y Derogaciones de C.I. Matec Logística S.A.S.", "",
    `Enlace de acceso: ${enlace || "(el Administrador le enviará el enlace)"}`,
    `Usuario: ${correo}`,
    clave ? `Contraseña temporal: ${clave}` : "Contraseña: use su contraseña actual o la opción «¿Olvidó su contraseña?» de la pantalla de ingreso.",
    `Rol asignado: ${rol}${area ? " — Área: " + area : ""}`, "",
    clave ? "Al ingresar por primera vez el aplicativo le pedirá cambiar la contraseña temporal por una personal."
      : "Puede cambiar su contraseña cuando quiera con el botón «Cambiar contraseña».",
    "Si olvida su contraseña, use «¿Olvidó su contraseña?» en la pantalla de ingreso.", "",
    "Cordialmente,", `${administrador} — Administrador del aplicativo`,
  ].join("\n");
}
