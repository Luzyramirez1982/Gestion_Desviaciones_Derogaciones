// Instructivo de la aplicación y guía de diligenciamiento del 8D (texto de la versión 1, ajustado a la versión nueva).
import { esc } from "../../src/util/html.js";
import { ROLES, MAX_FILE_MB } from "../../src/dominio/constantes.js";
import { ROLE_DESC } from "../../src/dominio/presentacion.js";
import { icon, areaBadge } from "../ui.js";
export function instructivo8DHTML(){
  const ej = t => `<div class="ej"><b>Ejemplo:</b> ${t}</div>`;
  const paso = (titulo, que, como, ejemplo, evitar) => `
    <div class="paso8d">
      <h3>${titulo}</h3>
      <p><b>Qué es:</b> ${que}</p>
      <p><b>Cómo se diligencia en el aplicativo:</b> ${como}</p>
      ${ejemplo}
      ${evitar ? `<p class="hint"><b>Evite:</b> ${evitar}</p>` : ""}
    </div>`;
  return `
  <div id="instructivo-8d">
    <h2>Instructivo de diligenciamiento del 8D</h2>
    <p>El reporte 8D (ocho disciplinas) es obligatorio en toda <b>derogación</b>. Ordena el análisis del problema desde que se detecta hasta que se cierra, y evita que vuelva a ocurrir. Todos los ejemplos de este instructivo usan el mismo caso:</p>
    <div class="callout"><b>Caso guía:</b> en el turno 3, las piezas soldadas de anclaje del módulo aeroportuario A-12 salen fuera de la tolerancia de ±0,5 mm. Se solicita una derogación temporal del criterio de aceptación mientras se elimina la causa.</div>

    <h3>Contención, corrección y acción correctiva: no son lo mismo</h3>
    <div style="overflow-x:auto;">
    <table class="simple">
      <thead><tr><th></th><th>Contención</th><th>Corrección</th><th>Acción correctiva</th><th>Acción preventiva</th></tr></thead>
      <tbody>
        <tr><td><b>Qué hace</b></td><td>Aísla y limita el efecto del problema <b>mientras</b> se investiga. Protege al cliente, al producto y a las personas.</td><td>Elimina la no conformidad <b>ya detectada</b>: arregla, reprocesa o reemplaza lo afectado.</td><td>Elimina la <b>causa raíz</b> para que el problema <b>no se repita</b>.</td><td>Extiende la solución a otros procesos, líneas o productos donde <b>podría</b> ocurrir.</td></tr>
        <tr><td><b>Pregunta que responde</b></td><td>¿Cómo evito que el problema siga saliendo o haga daño ahora?</td><td>¿Qué hago con lo que ya salió mal?</td><td>¿Qué cambio para que no vuelva a pasar?</td><td>¿Dónde más podría pasar y cómo lo evito?</td></tr>
        <tr><td><b>Cuándo</b></td><td>De inmediato (horas).</td><td>De inmediato o a corto plazo.</td><td>Después de encontrar la causa raíz (D4).</td><td>Después de validar la acción correctiva.</td></tr>
        <tr><td><b>Duración</b></td><td>Temporal: se retira cuando la acción correctiva funciona.</td><td>Puntual: se hace una vez sobre lo afectado.</td><td>Permanente.</td><td>Permanente.</td></tr>
        <tr><td><b>Dónde se registra</b></td><td>D3</td><td>D3 (escriba "Corrección:" al inicio de la acción)</td><td>D5 (se implementa y valida en D6)</td><td>D7</td></tr>
        <tr><td><b>Ejemplo — caso guía</b></td><td>Inspeccionar al 100 % las piezas del turno 3 y separar las no conformes.</td><td>Reprocesar (resoldar) las 42 piezas fuera de tolerancia.</td><td>Reemplazar la plantilla desgastada e incluirla en el plan de mantenimiento.</td><td>Revisar las plantillas de las demás estaciones de soldadura.</td></tr>
        <tr><td><b>Ejemplo — caso SST</b></td><td>Bloqueo y etiquetado (LOTO) y delimitar el área mientras la guarda está retirada.</td><td>Reinstalar la guarda al terminar la calibración.</td><td>Diseñar una guarda con ventana de inspección para no tener que retirarla.</td><td>Revisar las guardas de las otras celdas robotizadas.</td></tr>
      </tbody>
    </table>
    </div>
    <div class="callout warn">Regla práctica: si la acción <b>deja de ser necesaria</b> cuando se elimina la causa, es <b>contención</b>. Si actúa sobre <b>lo que ya salió mal</b>, es <b>corrección</b>. Si <b>cambia el proceso</b> para que no se repita, es <b>acción correctiva</b>.</div>

    <h3>Paso a paso</h3>
    ${paso("D1 · Equipo",
      "El grupo de personas que analizará y resolverá el problema. Debe ser multidisciplinario, con conocimiento del proceso y autoridad para actuar, y con un líder.",
      "Escriba los nombres y cargos, indicando quién lidera.",
      ej("Líder: Juan Daniel Orozco (Responsable del proceso de Calidad Producto). Integrantes: supervisor de soldadura, operario del turno 3, técnico de mantenimiento, ingeniero de procesos."),
      "equipos de una sola persona o sin nadie que conozca el proceso donde ocurrió el problema.")}
    ${paso("D2 · Descripción del problema — herramienta 5W2H",
      "Describir el problema con hechos y datos, sin suponer causas ni soluciones.",
      "Responda las 7 preguntas (todas obligatorias). La síntesis es opcional y resume el problema en una frase.",
      `<table class="simple" style="margin:6px 0;"><tbody>
        <tr><td><b>What</b> — ¿Qué ocurrió?</td><td>Piezas de anclaje soldadas fuera de la tolerancia de ±0,5 mm.</td></tr>
        <tr><td><b>Where</b> — ¿Dónde?</td><td>Estación de soldadura 3, planta Itagüí.</td></tr>
        <tr><td><b>When</b> — ¿Cuándo?</td><td>Turno 3, lote de septiembre; detectado el 05/09 en la inspección final.</td></tr>
        <tr><td><b>Who</b> — ¿Quién o qué está involucrado?</td><td>Operarios del turno 3, plantilla de fijación, módulo A-12.</td></tr>
        <tr><td><b>Why</b> — ¿Por qué es importante?</td><td>Es un anclaje estructural: puede fallar en la instalación del cliente.</td></tr>
        <tr><td><b>How</b> — ¿Cómo se manifiesta?</td><td>Desplazamiento del punto de anclaje de hasta 0,9 mm en la medición.</td></tr>
        <tr><td><b>How much</b> — ¿Cuánto representa?</td><td>42 de 300 piezas (14 %); 16 horas de reproceso.</td></tr>
      </tbody></table>`,
      "escribir la causa (\"la plantilla está desgastada\") en D2: eso va en D4.")}
    ${paso("D3 · Acciones de contención",
      "Acciones inmediatas y temporales que impiden que el problema siga llegando al cliente o haciendo daño mientras se investiga. Aquí también se registran las correcciones.",
      "Agregue una fila por acción con: <b>Acción</b> (qué se hace), <b>Punto de control</b> (dónde y cómo se verifica que la contención funciona), <b>Fecha de realización</b> y <b>Responsable</b>. Debe haber al menos una fila completa.",
      `<table class="simple" style="margin:6px 0;"><thead><tr><th>Acción</th><th>Punto de control</th><th>Fecha</th><th>Responsable</th></tr></thead><tbody>
        <tr><td>Inspección dimensional al 100 % de las piezas del turno 3</td><td>Salida de la estación de soldadura 3</td><td>06/09/2026</td><td>Inspector de calidad</td></tr>
        <tr><td>Separar con tarjeta roja las piezas no conformes</td><td>Zona de producto no conforme</td><td>06/09/2026</td><td>Supervisor de soldadura</td></tr>
        <tr><td>Corrección: resoldar las 42 piezas fuera de tolerancia</td><td>Reinspección antes de despacho</td><td>08/09/2026</td><td>Supervisor de soldadura</td></tr>
      </tbody></table>`,
      "confundir contención con la solución definitiva. Inspeccionar al 100 % no elimina la causa, solo protege mientras se resuelve.")}
    ${paso("D4 · Causa raíz — herramienta 5 Porqués",
      "Encontrar la causa real que, si se elimina, evita que el problema se repita.",
      "Parta del problema de D2 y pregunte \"¿por qué?\" sobre cada respuesta. Los 3 primeros porqués son obligatorios; use el 4 y el 5 si todavía no llega a una causa que se pueda controlar. Al final escriba la <b>causa raíz identificada</b>.",
      `<table class="simple" style="margin:6px 0;"><tbody>
        <tr><td><b>1.</b> ¿Por qué salen fuera de tolerancia?</td><td>Porque la pieza se desplaza durante la soldadura.</td></tr>
        <tr><td><b>2.</b> ¿Por qué se desplaza?</td><td>Porque la plantilla de fijación tiene juego.</td></tr>
        <tr><td><b>3.</b> ¿Por qué tiene juego?</td><td>Porque los pines de posicionamiento están desgastados.</td></tr>
        <tr><td><b>4.</b> ¿Por qué no se detectó el desgaste?</td><td>Porque el mantenimiento preventivo no incluye la plantilla.</td></tr>
        <tr><td colspan="2"><b>Causa raíz:</b> el plan de mantenimiento preventivo no contempla la revisión de las plantillas de fijación.</td></tr>
      </tbody></table>`,
      "quedarse en \"error humano\" o \"falta de cuidado\". Pregunte por qué el proceso permitió ese error.")}
    ${paso("D5 · Acciones correctivas permanentes",
      "Las acciones que eliminan la causa raíz de forma definitiva.",
      "Agregue una fila por acción con: <b>Causa</b> (la causa de D4 que ataca), <b>Acción correctiva</b>, <b>Fecha de realización</b> y <b>Responsable</b>. Cada causa de D4 debe tener al menos una acción.",
      `<table class="simple" style="margin:6px 0;"><thead><tr><th>Causa</th><th>Acción correctiva</th><th>Fecha</th><th>Responsable</th></tr></thead><tbody>
        <tr><td>Pines de la plantilla desgastados</td><td>Reemplazar la plantilla de fijación</td><td>12/09/2026</td><td>Mantenimiento</td></tr>
        <tr><td>Mantenimiento preventivo no revisa la plantilla</td><td>Incluir la revisión mensual de plantillas en el plan de mantenimiento</td><td>30/09/2026</td><td>Jefe de mantenimiento</td></tr>
      </tbody></table>`,
      "repetir aquí las acciones de contención de D3 o proponer acciones que no atacan la causa (\"capacitar al operario\" cuando la causa es un equipo).")}
    ${paso("D6 · Implementación y validación",
      "Evidencia de que las acciones de D5 se implementaron y de que funcionan.",
      "Escriba qué se implementó, cuándo y con qué resultado medible. Adjunte las evidencias (fotos, registros, mediciones) en \"Evidencias adjuntas\". Cuando la acción está validada, se puede retirar la contención de D3.",
      ej("Plantilla reemplazada el 12/09. Cinco lotes consecutivos (1.500 piezas) con 0 % fuera de tolerancia en inspección al 100 %. Se retira la inspección reforzada el 20/09."),
      "declarar la acción como \"implementada\" sin datos que demuestren que el problema desapareció.")}
    ${paso("D7 · Acciones preventivas",
      "Extender lo aprendido para que el problema no aparezca en otros procesos, líneas o productos similares, y actualizar la documentación.",
      "Describa dónde más se aplicó la solución y qué documentos se actualizaron (procedimientos, AMEF, plan de control, instructivos).",
      ej("Se revisaron las plantillas de las estaciones 1, 2 y 4 (una reemplazada preventivamente). Se actualizaron el plan de mantenimiento y el plan de control de soldadura."),
      null)}
    ${paso("D8 · Cierre y reconocimiento",
      "Cierre formal del 8D y reconocimiento del trabajo del equipo.",
      "Registre la fecha de cierre, quién lo aprueba y el reconocimiento al equipo. Luego el registro sigue su ciclo normal de etapas y firmas.",
      ej("8D cerrado el 25/09/2026 con aprobación del Responsable del proceso de Calidad Producto. Se reconoce al equipo de soldadura del turno 3 en la reunión mensual de calidad."),
      null)}

    <h3>Antes de enviar, verifique</h3>
    <ul>
      <li>D2 describe el problema con datos y no menciona causas.</li>
      <li>Cada acción de D3 tiene punto de control, fecha y responsable.</li>
      <li>La causa raíz de D4 es algo que el proceso puede controlar.</li>
      <li>Cada causa de D4 tiene al menos una acción en D5, con fecha y responsable.</li>
      <li>D6 incluye resultados medibles y las evidencias están adjuntas.</li>
    </ul>
  </div>`;
}

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

function flujosEjemploHTML(){
  const etapas = ["1 · Solicitud","2 · Evaluación y Aprobación","3 · Cierre"];
  return FLUJOS_EJEMPLO.map(f => `
    <div class="paso8d">
      <h3>${areaBadge(f.tema, [])} </h3>
      <p><b>Caso:</b> ${esc(f.caso)}</p>
      <div class="flow-grid">${f.pasos.map((p, i) => `<div class="flow-step"><div class="flow-num">${etapas[i]}</div><div>${p}</div></div>`).join("")}</div>
    </div>`).join("");
}

export function html(){
  const pasos = (arr) => `<ol class="steps">${arr.map(p=>`<li>${p}</li>`).join("")}</ol>`;
  return `
  <div class="help card">
    <h2>¿Qué es este aplicativo?</h2>
    <p>Es la herramienta que implementa el <b>Procedimiento de Gestión de Desviaciones y Derogaciones</b> de MATEC. Permite diligenciar, evaluar, aprobar y cerrar desviaciones y derogaciones dirigidas a las áreas: <b>${AREAS.map(esc).join(", ")}</b>. Cada solicitud indica a qué área va dirigida, el tema con el que se relaciona y el tipo específico de desviación o derogación (si ninguna opción de la lista se ajusta, se elige «Otro» y se escribe); cuando el área es <b>Seguridad y Salud en el Trabajo</b>, el tipo específico es la clase de peligro y se clasifica según el Anexo A de la GTC 45.</p>

    <h2>Ingreso al aplicativo y contraseñas</h2>
    ${pasos([
      "El Administrador crea su usuario (nombre, correo, rol y área). El aplicativo genera una <b>contraseña temporal</b> y muestra una tarjeta para compartir el acceso con el <b>enlace</b>, el <b>usuario</b> (su correo) y la contraseña; también se puede copiar o enviar por WhatsApp.",
      "Ingrese con su correo y la contraseña temporal. En el primer ingreso el aplicativo le pide crear una contraseña personal.",
      "Puede cambiar su contraseña cuando quiera con el botón <b>Cambiar contraseña</b> (arriba a la derecha) y salir con <b>Cerrar sesión</b>.",
      "Si olvida su contraseña, use <b>¿Olvidó su contraseña?</b> en la pantalla de ingreso: recibirá un correo con un enlace para crear una nueva. El Administrador también puede enviárselo con <b>Restablecer contraseña</b>."
    ])}

    <h2>Derogación temporal o definitiva</h2>
    <p>Al registrar una <b>derogación</b> se indica si es <b>temporal</b> (se registra el rango de fechas desde–hasta en que aplica, y el panel avisa cuando está por vencer) o <b>definitiva</b> (se registra la fecha a partir de la cual se hace efectiva de forma permanente). Durante la Evaluación y Aprobación el alcance se puede ajustar desde el detalle del registro y el cambio queda en la bitácora.</p>

    <h2>Bondades del aplicativo</h2>
    <div class="benefit-grid">
      <div class="benefit"><b>Un solo lugar para todo</b><span>Cada solicitud vive en un único registro digital, desde que se diligencia hasta que se cierra.</span></div>
      <div class="benefit"><b>Ciclo corto</b><span>Tres etapas — Solicitud, Evaluación y Aprobación, Cierre — con un responsable claro en cada una.</span></div>
      <div class="benefit"><b>Borradores</b><span>Puede guardar el avance de una solicitud sin firmarla y terminarla después desde "Nuevo registro".</span></div>
      <div class="benefit"><b>Consecutivo automático</b><span>Al enviar, cada solicitud recibe un número único (MTC-###) para hacer seguimiento.</span></div>
      <div class="benefit"><b>Aprobación con firma</b><span>Cada etapa se aprueba con la firma de su responsable y la solicitud pasa sola a la siguiente.</span></div>
      <div class="benefit"><b>Devolución para ajustes</b><span>El Aprobador puede devolver la solicitud con un motivo; el Responsable la corrige y la reenvía sin perder la trazabilidad.</span></div>
      <div class="benefit"><b>Histórico en Excel</b><span>Desde "Registros" se descarga el histórico con las hojas Registros, Bitácora y Acciones 8D.</span></div>
      <div class="benefit"><b>PDF de trazabilidad</b><span>Al cerrar se descarga un PDF con toda la historia, las firmas y la bitácora.</span></div>
      <div class="benefit"><b>Clasificación SST según GTC 45</b><span>Las solicitudes de SST se clasifican por clase de peligro y descripción específica del Anexo A de la GTC 45.</span></div>
      <div class="benefit"><b>Análisis 8D integrado</b><span>Toda derogación exige el 8D completo (5W2H, contención, 5 Porqués y acciones correctivas) antes de aprobarse.</span></div>
      <div class="benefit"><b>Avisos por correo</b><span>Al enviar, aprobar, devolver o cerrar se prepara el correo para quien sigue.</span></div>
      <div class="benefit"><b>Trazabilidad completa</b><span>La bitácora guarda quién hizo qué, en qué etapa, cuándo y con qué comentario.</span></div>
      <div class="benefit"><b>Alertas de vencimiento</b><span>El panel de control resalta las vigencias que vencen en 7 días o menos.</span></div>
      <div class="benefit"><b>Datos en la nube</b><span>Con la base de datos conectada, todos ven la misma información desde cualquier equipo.</span></div>
    </div>

    <h2>Desviación vs. Derogación</h2>
    <table class="simple">
      <thead><tr><th>Figura</th><th>Definición</th><th>¿Requiere 8D?</th></tr></thead>
      <tbody>
        <tr><td><span class="badge" style="background:#dbeafe;color:#1d4ed8;">Desviación</span></td><td>Autorización temporal que no elimina el requisito; exige controles, responsable y vigencia.</td><td>No (criticidad Menor o Mayor)</td></tr>
        <tr><td><span class="badge" style="background:#fee2e2;color:#b91c1c;">Derogación</span></td><td>Deja sin efecto el cumplimiento de un requisito dentro de un alcance y periodo autorizados.</td><td><b>Sí, siempre</b>; debe estar completo antes de aprobar. Puede ser Menor, Mayor o Crítica.</td></tr>
      </tbody>
    </table>

    <h2>El ciclo: Solicitud → Evaluación y Aprobación → Cierre</h2>
    <table class="simple">
      <thead><tr><th>Etapa</th><th>Qué se hace</th><th>Quién lo hace y firma</th></tr></thead>
      <tbody>
        <tr><td>1. Solicitud</td><td>Se diligencia la solicitud (se puede guardar como borrador) y se firma. Al enviarla pasa de inmediato a Evaluación y Aprobación.</td><td>Responsable del proceso</td></tr>
        <tr><td>2. Evaluación y Aprobación</td><td>Concepto de evaluación, medidas de control y, en derogaciones, el 8D completo. Aprueba con firma, o devuelve o rechaza con motivo.</td><td>Aprobador autorizado</td></tr>
        <tr><td>3. Cierre</td><td>Finalizada la actividad: observaciones de cierre y cumplimiento de controles.</td><td>El Responsable del proceso que hizo la solicitud</td></tr>
      </tbody>
    </table>
    <div class="callout"><b>Regla de avance:</b> la solicitud pasa a la siguiente etapa <b>solo cuando el responsable de la etapa en curso firma</b> en "Firmas de aprobación", al final del registro. Nadie puede firmar por otro rol, ni siquiera el Administrador. Si el Aprobador devuelve la solicitud, vuelve a la etapa Solicitud y el Responsable del proceso la corrige y la reenvía con una nueva firma.</div>
    <div class="callout">${icon("download")} <b>PDF de trazabilidad:</b> cuando el Responsable del proceso cierra la solicitud (o el Aprobador la rechaza), aparece el botón "Descargar PDF de trazabilidad". <b>Histórico en Excel:</b> botón "Descargar histórico (Excel)" en Registros.</div>

    <h2>Roles</h2>
    <table class="simple">
      <thead><tr><th>Rol</th><th>Qué hace</th></tr></thead>
      <tbody>${ROLES.map(r => `<tr><td><span class="role-pill">${esc(r)}</span></td><td>${esc(ROLE_DESC[r])}</td></tr>`).join("")}</tbody>
    </table>

    <h2>Alcance del Aprobador autorizado</h2>
    <table class="simple">
      <thead><tr><th>Puede</th><th>No puede</th></tr></thead>
      <tbody><tr>
        <td><ul style="margin:0;">
          <li>Consultar todos los registros y su bitácora.</li>
          <li>Actuar <b>solo en la etapa 2 "Evaluación y Aprobación"</b>.</li>
          <li>Registrar el concepto de evaluación, las medidas de control y las observaciones; revisar o completar el 8D.</li>
          <li><b>Aprobar</b> con "Evaluar, aprobar y firmar"; la solicitud pasa a Cierre.</li>
          <li><b>Devolver al Responsable del proceso</b> o <b>Rechazar</b>, con motivo obligatorio.</li>
        </ul></td>
        <td><ul style="margin:0;">
          <li>Diligenciar ni firmar la solicitud.</li>
          <li>Cerrar la solicitud.</li>
          <li>Administrar usuarios, áreas ni tipos.</li>
        </ul></td>
      </tr></tbody>
    </table>

    <h2>Paso a paso por rol</h2>
    <div class="callout">Para probar cada rol, cambie de usuario en el selector "Sesión" (arriba a la derecha).</div>

    <h3>1. Responsable del proceso — Solicitud y Cierre</h3>
    ${pasos([
      'Entre a <b>Nuevo registro</b>.',
      '<b>1. Información del solicitante:</b> fecha y hora, nombre y apellido, cargo, área (según organigrama) y proceso.',
      '<b>2. Clasificación y proyecto:</b> área a la que va dirigida, tipo específico de desviación (si el área es SST, también la clasificación GTC 45), OT, proyecto, línea de negocio, figura y criticidad.',
      'Describa la solicitud, adjunte evidencias y, si es derogación, diligencie lo que conozca del 8D.',
      '¿No terminó? Pulse <b>Guardar borrador</b>. Sus borradores aparecen al inicio de "Nuevo registro" con el botón <b>Continuar</b>.',
      'Cuando esté completa, dibuje su firma, marque la casilla de veracidad y pulse <b>Firmar y enviar solicitud</b>. Verá el <b>consecutivo asignado</b>.',
      'Si el Aprobador la <b>devuelve</b>, aparece en sus borradores como "Devuelta para ajustes": pulse <b>Continuar</b> (o "Corregir y reenviar" en el registro), corrija y vuelva a firmar y enviar.',
      'Cuando la solicitud esté aprobada y la actividad termine, abra el registro (etapa <b>Cierre</b>), escriba las observaciones de cierre, marque si se cumplieron los controles y firme en "3 · Cierre" con <b>Cerrar solicitud y firmar</b>.',
      'Descargue el <b>PDF de trazabilidad</b> desde el registro cerrado.',
    ])}

    <h3>2. Aprobador autorizado — Evaluación y Aprobación</h3>
    ${pasos([
      'Entre a <b>Registros</b> y filtre por etapa <b>Evaluación y Aprobación</b>.',
      'Revise la solicitud, las evidencias y la bitácora.',
      'Registre el <b>concepto de evaluación</b> y las <b>medidas de control</b> (se guardan solos al salir de cada campo; puede volver después). En derogaciones, revise o complete el <b>8D</b>.',
      'Para aprobar: firme en "2 · Evaluación y Aprobación" con <b>Evaluar, aprobar y firmar</b>. La solicitud pasa a Cierre y se avisa al Responsable del proceso.',
      'Para devolver o rechazar: escriba el motivo en el comentario y pulse <b>Devolver al Responsable del proceso</b> o <b>Rechazar solicitud</b>.',
    ])}

    <h3>3. Administrador</h3>
    ${pasos([
      'En <b>Usuarios</b>: cree, edite o elimine usuarios y asígneles rol y área.',
      'En la tabla de <b>áreas</b>: edite nombres, agregue o elimine áreas.',
      'En <b>Tipos de desviación</b>: mantenga los tipos específicos de cada área.',
      'En <b>Registros</b>: descargue el histórico en Excel. Si hace falta corregir una solicitud aprobada, use <b>Etapa anterior</b> (anula la firma de aprobación).',
    ])}

    <h2>Ejemplos de flujo por tipo de solicitud</h2>
    <p>El flujo es el mismo para todas las áreas; cambia el área y quién es el Responsable del proceso. Los registros de ejemplo del aplicativo (MTC-001 a MTC-005) siguen estos casos.</p>
    ${flujosEjemploHTML()}

    ${instructivo8DHTML()}

    <h2>Herramientas del 8D (resumen)</h2>
    <ul>
      <li><b>D2 · 5W2H</b>: What, Where, When, Who, Why, How, How much. Las 7 son obligatorias.</li>
      <li><b>D3 · Acciones de contención</b>: tabla con acción, punto de control, fecha de realización y responsable.</li>
      <li><b>D4 · 5 Porqués</b>: mínimo 3 porqués y la causa raíz identificada.</li>
      <li><b>D5 · Acciones correctivas</b>: tabla con causa, acción correctiva, fecha de realización y responsable.</li>
    </ul>

    <h2>Persistencia de datos</h2>
    <ul>
      <li><b>Modo conectado</b> (indicador verde "Base de datos conectada"): todo se guarda en Supabase, incluidos los borradores, y lo ven los usuarios autorizados.</li>
      <li><b>Modo demostración</b> (indicador amarillo): los datos son de ejemplo y se pierden al recargar la página. No se usa con datos reales.</li>
    </ul>
    <p class="hint">Los archivos adjuntos se guardan aparte, en un espacio privado, y se abren con un enlace temporal. Cada archivo puede pesar hasta ${MAX_FILE_MB} MB y las fotos se reducen automáticamente. Mientras escribe, la aplicación guarda sola y muestra «Guardando…», «Guardado» o «Error al guardar» (con la opción de reintentar).</p>
  </div>
  `;
}

export function montar(){}

// Se abre en una ventana emergente para no perder lo que se está diligenciando.
export function abrirInstructivo8D(){
  document.getElementById("modalInstructivo8D")?.remove();
  const capa = document.createElement("div");
  capa.id = "modalInstructivo8D";
  capa.className = "panel-overlay";
  capa.style.zIndex = "60";
  capa.innerHTML = `<div class="panel" style="max-width:820px;">
    <div class="panel-head"><div style="font-size:15.5px;font-weight:700;">Instructivo del 8D</div><button class="panel-close" id="cerrarInstructivo" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="panel-body help">${instructivo8DHTML()}</div></div>`;
  document.body.appendChild(capa);
  capa.addEventListener("click", e => { if(e.target === capa) capa.remove(); });
  capa.querySelector("#cerrarInstructivo").addEventListener("click", () => capa.remove());
}
