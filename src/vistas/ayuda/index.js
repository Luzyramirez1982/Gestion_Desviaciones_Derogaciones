// Pantalla del Instructivo: ingreso, roles, etapas, derogaciones y archivos.
import { esc } from "../../util/html.js";
import { ROLES, MAX_FILE_MB } from "../../dominio/constantes.js";
import { ROLE_DESC } from "../../dominio/presentacion.js";
import { icon } from "../../componentes/iconos.js";
import { flujosEjemploHTML } from "./flujosEjemplo.js";
import { instructivo8DHTML } from "./instructivo8d.js";

export function html(ctx){
  const areas = ctx.nombresAreas();
  const pasos = (arr) => `<ol class="steps">${arr.map(p=>`<li>${p}</li>`).join("")}</ol>`;
  return `
  <div class="help card">
    <h2>¿Qué es este aplicativo?</h2>
    <p>Es la herramienta que implementa el <b>Procedimiento de Gestión de Desviaciones y Derogaciones</b> de MATEC. Permite diligenciar, evaluar, aprobar y cerrar desviaciones y derogaciones dirigidas a las áreas: <b>${areas.map(esc).join(", ")}</b>. Cada solicitud indica a qué área va dirigida, el tema con el que se relaciona y el tipo específico de desviación o derogación (si ninguna opción de la lista se ajusta, se elige «Otro» y se escribe); cuando el área es <b>Seguridad y Salud en el Trabajo</b>, el tipo específico es la clase de peligro y se clasifica según el Anexo A de la GTC 45.</p>

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
