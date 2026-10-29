// Ejemplos de cómo recorre una solicitud las tres etapas, uno por tema.
import { esc } from "../../util/html.js";
import { areaBadge } from "../../componentes/insignias.js";

const FLUJOS_EJEMPLO = [
  { tema:"Seguridad y Salud en el Trabajo", caso:"Retirar temporalmente la guarda del brazo robótico R3 para calibrarlo fuera de ciclo (peligro: Condiciones de seguridad → Mecánico).",
    pasos:[
      "El <b>Responsable del proceso</b> diligencia la solicitud dirigida al área de Seguridad y Salud en el Trabajo, tipo \"Condiciones de seguridad\" y condición \"Mecánico\"; describe EPP, procedimiento alternativo y compañero de apoyo, y firma. Si no termina, guarda el borrador y lo completa después.",
      "El <b>Aprobador autorizado</b> evalúa el riesgo, registra el concepto (\"Viable con LOTO, modo manual y acompañante, por 3 días\") y las medidas de control, y aprueba con su firma.",
      "Al terminar la calibración, el <b>Responsable del proceso que hizo la solicitud</b> verifica que la guarda quedó reinstalada, registra las observaciones de cierre y el cumplimiento de controles, y cierra con su firma.",
    ]},
  { tema:"Calidad Producto", caso:"Aceptar temporalmente piezas soldadas con tolerancia ampliada mientras se corrige la causa (derogación con 8D).",
    pasos:[
      "El <b>Responsable del proceso</b> de Calidad diligencia la derogación dirigida a Calidad Producto, tipo \"Fuera de especificación (OOS)\", criticidad Crítica, inicia el 8D y firma.",
      "El <b>Aprobador autorizado</b> revisa y completa el 8D (5W2H, contención, 5 Porqués, acciones correctivas), registra el concepto y las medidas de control (inspección al 100 %) y aprueba con su firma; si falta información, la devuelve al Responsable del proceso.",
      "Validadas las acciones correctivas, el <b>Responsable del proceso que hizo la solicitud</b> deja las observaciones de cierre (\"5 lotes sin piezas fuera de tolerancia\") y cierra con su firma.",
    ]},
  { tema:"Producción", caso:"Operar la banda transportadora a velocidad reducida mientras se corrige su desalineación.",
    pasos:[
      "El <b>Responsable del proceso</b> de Producción diligencia la desviación, tipo \"Falla mecánica / parada no programada\", y firma.",
      "El <b>Aprobador autorizado</b> confirma que no hay alternativa sin detener el despacho, define la inspección visual cada hora y aprueba con su firma.",
      "Corregida la desalineación, el <b>Responsable del proceso</b> confirma la velocidad normal de la línea, registra el cierre y firma.",
    ]},
  { tema:"Ingeniería mecánica", caso:"Fabricar con un ajuste de tolerancia en el plano antes de completar el control de cambios.",
    pasos:[
      "El <b>Responsable del proceso</b> de Ingeniería mecánica diligencia la desviación, tipo \"Error en plano / tolerancia\", y firma.",
      "El <b>Aprobador autorizado</b> verifica que no hay impacto estructural, exige marcar el plano como provisional y aprueba con su firma.",
      "Formalizado el cambio, el <b>Responsable del proceso</b> registra el cierre (\"plano versión 3 aprobado\") y firma.",
    ]},
  { tema:"Ingeniería Automatización y Control", caso:"Operar la línea 2 con monitoreo manual mientras se corrigen los reinicios del PLC (derogación recurrente).",
    pasos:[
      "El <b>Responsable del proceso</b> de Automatización diligencia la derogación, tipo \"Error de PLC / lógica de control\", inicia el 8D y firma.",
      "El <b>Aprobador autorizado</b> completa el 8D, define el monitoreo permanente y aprueba con su firma.",
      "Actualizado el firmware y validados varios turnos sin reinicios, el <b>Responsable del proceso</b> cierra con observaciones y firma.",
    ]},
  { tema:"Ingeniería de Software", caso:"Usar temporalmente un parámetro de configuración distinto al estándar mientras se corrige un error del sistema.",
    pasos:[
      "El <b>Responsable del proceso</b> de Software diligencia la desviación, tipo \"Error de configuración / parametrización\", y firma.",
      "El <b>Aprobador autorizado</b> evalúa el impacto en los datos, define respaldos diarios como control y aprueba con su firma.",
      "Publicada la corrección, el <b>Responsable del proceso</b> verifica que se restableció la configuración estándar, registra el cierre y firma.",
    ]},
  { tema:"Dirección de Operaciones", caso:"Cambiar temporalmente la secuencia de trabajo por falta de un equipo.",
    pasos:[
      "El <b>Responsable del proceso</b> de Operaciones diligencia la desviación, tipo \"Recurso, equipo o personal no disponible\", y firma.",
      "El <b>Aprobador autorizado</b> evalúa el efecto en plazos y calidad, define controles y aprueba con su firma.",
      "Restablecido el equipo, el <b>Responsable del proceso</b> confirma el regreso a la secuencia normal, registra el cierre y firma.",
    ]},
  { tema:"Logística y Almacén", caso:"Almacenar temporalmente material fuera de la ubicación definida por falta de espacio.",
    pasos:[
      "El <b>Responsable del proceso</b> de Logística diligencia la desviación, tipo \"Almacenamiento fuera de condición\", y firma.",
      "El <b>Aprobador autorizado</b> define la señalización, la protección del material y el responsable del control, y aprueba con su firma.",
      "Reubicado el material, el <b>Responsable del proceso</b> verifica su estado, registra el cierre y firma.",
    ]},
];

export function flujosEjemploHTML(){
  const etapas = ["1 · Solicitud","2 · Evaluación y Aprobación","3 · Cierre"];
  return FLUJOS_EJEMPLO.map(f => `
    <div class="paso8d">
      <h3>${areaBadge(f.tema, [])} </h3>
      <p><b>Caso:</b> ${esc(f.caso)}</p>
      <div class="flow-grid">${f.pasos.map((p, i) => `<div class="flow-step"><div class="flow-num">${etapas[i]}</div><div>${p}</div></div>`).join("")}</div>
    </div>`).join("");
}
