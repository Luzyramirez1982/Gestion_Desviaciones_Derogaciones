// Texto del instructivo para diligenciar el reporte 8D (pasos, ejemplos y diferencias entre contención, corrección y acción correctiva).


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
