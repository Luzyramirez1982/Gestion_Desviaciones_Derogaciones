# Historial del proyecto — Gestión de Desviaciones y Derogaciones MATEC

Registro de las conversaciones de trabajo con Claude sobre este proyecto.
**Archivo de trabajo principal:** `index.html` (en esta misma carpeta). Todos los cambios se hacen sobre ese archivo.

---

## Sesión 1 — 28/09/2026

### Solicitud 1
> "Busca el artefacto llamado Gestión de desviaciones y derogaciones y conviértelo en mi nuevo proyecto dentro de esta carpeta."

**Qué se hizo:**
- Se revisaron los artefactos publicados. Se encontraron dos candidatos:
  - **GESTIÓN DE DESVIACIONES MATEC** — https://claude.ai/artifact/2uRRgnkJRp4Te5gb5GLvkR (título interno en la app: "Gestión de Desviaciones y Derogaciones"). **← Elegido como base del proyecto.**
  - Gestión de Desviaciones MATEC — https://claude.ai/artifact/RQxQfJmsX86gk5MRYjvxcu (versión anterior: estados Registrada / Pendiente / Devuelta / Aprobada / Cerrada y 4 roles). No se usó.
- Se creó la carpeta del proyecto `C:\Cowork\Gestión de desviaciones y derogaciones` con:
  - `index.html` — copia fiel del artefacto elegido (aplicativo completo).
  - `config.js` — plantilla de conexión a Supabase (el artefacto la referencia pero no estaba publicada). Sin configurar, la app funciona en **Modo local** con datos de ejemplo que no se guardan al recargar.
  - `supabase_schema.sql` — tablas `registros`, `usuarios`, `tipos_desviacion`.
  - `README.md` — instrucciones de uso y de activación de la base de datos.
- Se actualizó la nota de contexto del proyecto en Claude (`claude/contexto_proyecto_matec.md`) indicando que esta carpeta es la base de trabajo.

### Solicitud 2
> "Requiero crear un archivo HTML con este artefacto que será mi proyecto para continuar trabajando en él. A partir de aquí vamos a trabajar sobre el archivo que acabaste de crear... recuerda generar un archivo .MD para guardar la historia de esta conversación."

**Qué se hizo:**
- Se confirmó `index.html` como **archivo de trabajo único** del proyecto; los próximos cambios se harán directamente sobre él (ya no sobre el artefacto publicado).
- Se creó este archivo `HISTORIAL.md` para llevar la historia de las conversaciones. Se irá actualizando en cada sesión.

### Solicitud 3
> "Ahora muéstrame la aplicación."

**Qué se hizo:** se abrió `index.html` en el panel de vista previa (modo local con datos de ejemplo).

---

## Sesión 2 — 29/09/2026

### Solicitud 4
> Se comparte la URL y la clave publishable de Supabase para crear la base de datos y guardar los cambios de la aplicación.

**Qué se hizo:**
- `config.js` actualizado con el proyecto Supabase `https://ngwsvtlgripohebhtbxs.supabase.co` y su clave publishable.
- `supabase_schema.sql` ajustado para poder ejecutarse varias veces sin error (borra y recrea las políticas) y con permisos explícitos para la clave publishable.
- Las tablas **no se pudieron crear automáticamente**: la clave publishable no tiene permiso para crear tablas (solo leer/escribir datos) y el entorno de Claude no tiene acceso de red a Supabase. La usuaria debe ejecutar `supabase_schema.sql` una vez en el SQL Editor de Supabase.
- Al abrir `index.html` con la base vacía, la app carga automáticamente los usuarios, tipos y registros de ejemplo; desde ahí todo cambio queda guardado.

### Solicitud 5
> Se comparten las instrucciones de conexión de Supabase para Next.js (npm install @supabase/supabase-js @supabase/ssr, .env.local, utils/supabase/server.ts, client.ts, middleware.ts, npx skills add supabase/agent-skills).

**Qué se decidió:** no aplicar esas instrucciones. Son para un proyecto Next.js con servidor; el aplicativo es un único `index.html` que carga supabase-js desde CDN y lee la URL y la clave desde `config.js`, que es lo equivalente y ya está hecho. Migrar a Next.js queda como opción futura, solo si se decide.

### Solicitud 6
> "Actualiza la información también en esta ruta: C:\COWORK\Gestión de proyectos."

**Qué se hizo:**
- Se copió el proyecto completo (index.html, config.js, supabase_schema.sql, README.md, HISTORIAL.md) a `C:\COWORK\Gestión de proyectos\Gestión de Desviaciones y Derogaciones\`. Se usó una subcarpeta porque `config.js` debe estar junto a `index.html`, y para no reemplazar el `Gestión de Desviaciones MATEC.html` anterior que ya estaba en esa carpeta (es la otra versión del aplicativo, con 4 roles y 5 estados).
- Se agregó una sección nueva al final de los dos `Historial del proyecto.md` de esa carpeta (el de la raíz y el de `Claude outputs`), explicando el cambio al nuevo proyecto base.

### Solicitud 7
> Redactar el Instructivo paso a paso por rol y describir las bondades del aplicativo, dejando claro el alcance del Aprobador autorizado. Permitir cargar más de un archivo. Rol Solicitante: no habilitar las ventanas de las demás etapas; solo aviso de creación con el consecutivo para seguimiento. Función para editar y eliminar usuarios y asignarles rol y área. Cada rol debe tener al final la opción de firmar su aprobación.

**Qué se hizo en `index.html`:**
1. **Instructivo reescrito**: 12 bondades del aplicativo, tabla de las 8 etapas con el rol que avanza cada una, sección **"Alcance del Aprobador autorizado"** (puede / no puede), paso a paso para los 7 roles, explicación de las firmas y de la persistencia.
2. **Alcance del Aprobador autorizado (implementado)**: actúa solo en la etapa 5 "Aprobación". Aprueba firmando en su espacio y pulsando "Aprobar y avanzar" (sin su firma la etapa no avanza, ni siquiera con el Administrador); puede **Devolver para ajustes** (vuelve a Controles compensatorios) o **Rechazar** (cierra como "Rechazada"), ambos con motivo obligatorio. No edita contenido técnico.
3. **Varios archivos**: en "Nuevo registro" se pueden seleccionar varios archivos a la vez y volver a agregar más; se ven en una lista y se pueden quitar antes de enviar. En el detalle de cualquier registro abierto se pueden adjuntar más (varios por cargue). Los archivos se guardan de verdad (se pueden descargar), máximo 5 MB cada uno, 10 por cargue, y cada cargue queda en la bitácora.
4. **Rol Solicitante**: ya no ve el Panel de control ni las etapas. Menú: Nuevo registro, Mis solicitudes, Instructivo. Al enviar ve una pantalla de **aviso de creación con el consecutivo asignado** (MTC-###). En "Mis solicitudes" busca por consecutivo y ve un estado simplificado (Recibida / En evaluación / Aprobada / Rechazada / Cerrada), puede agregar evidencias y completar el 8D si quedó pendiente. Ya no puede avanzar la etapa "Solicitud" (la avanza el Responsable del proceso).
5. **Usuarios**: botón **Editar** (nombre, correo, rol y área), **Eliminar** con confirmación, validaciones (correo válido y no repetido, área obligatoria para Responsable del proceso, siempre al menos un Administrador). Si cambia el nombre, sus registros se actualizan para no perder el seguimiento. Nueva tabla "Responsables del proceso por área".
6. **Firmas de aprobación por rol**: al final de cada registro hay un espacio de firma para cada uno de los 8 roles. Cada usuario firma solo en el de su rol (el Responsable del proceso solo en su área; el Aprobador solo en la etapa de Aprobación), con nombre y fecha; puede borrar su firma y volver a firmar. Todo queda en la bitácora.
7. Consecutivo mejorado: toma el número más alto existente + 1 (no se repite aunque se borren registros).

**Verificación:** sintaxis JS validada y 33 pruebas funcionales simuladas en navegador (jsdom), todas correctas.

---

## Sesión 3 — 30/09/2026

### Solicitud 8
> PDF de toda la trazabilidad al cierre. Nuevas áreas en "Responsables del proceso por área" (Ingeniería Automatización y Control; Ingeniería de Software; Ingeniería mecánica; Calidad Producto; Dirección de Operaciones; Producción; Logística y Almacén) y poder editarlas o agregar más. Retirar la frase "reemplazando los formatos físicos (incluido el SST-for-064)". SST solo evalúa casos de SST. Para avanzar, la etapa anterior debe estar aprobada y firmada por el responsable. D2 con la herramienta 5W2H y D4 con los 5 Porqués.

**Qué se hizo en `index.html`:**
1. **PDF de trazabilidad**: cuando el registro llega a Cierre (o es rechazado) aparece "Descargar PDF de trazabilidad" (también para el Solicitante). Incluye resumen, solicitante, descripción, evaluación técnica, 8D completo (tabla 5W2H y 5 Porqués), cierre, evidencias, firmas por etapa con su imagen y bitácora, con numeración de páginas. Usa jsPDF desde internet; sin conexión abre la vista de impresión para "Guardar como PDF". Cada descarga queda en la bitácora.
2. **Áreas**: las 7 áreas nuevas reemplazan a las anteriores, con tipos de desviación propios. En Usuarios → "Responsables del proceso por área" se puede **editar el nombre** (se actualiza en registros, usuarios, tipos y filtros), **agregar** áreas y **eliminar** las que no tengan registros ni usuarios. Se guardan en la nueva tabla `configuracion` de Supabase. Los datos existentes se migran solos: Calidad de producto → Calidad Producto; Diseño → Ingeniería mecánica; Automatización y control → Ingeniería Automatización y Control; Seguridad y Salud en el Trabajo → Dirección de Operaciones (marcado como caso SST).
3. **Frase retirada** del Instructivo.
4. **SST**: el formulario tiene la casilla "relacionada con temas de SST" (con clase de peligro GTC 45 y detalle). Solo esos registros los ve, evalúa y firma el Líder de SST. El Responsable del proceso puede corregir la marca hasta la etapa 3.
5. **Aprobación etapa por etapa**: la sección de firmas ahora es por etapa (recepción, evaluación del proceso, Calidad, SST si aplica, controles, aprobación, implementación, seguimiento, más visto bueno opcional del Administrador). Cada responsable firma solo la etapa en curso; sin esa firma "Avanzar etapa" queda bloqueado, también para el Administrador. Al devolver o retroceder se anulan las firmas desde esa etapa. En derogaciones no se puede firmar si el 8D está incompleto.
6. **8D**: D2 con la herramienta **5W2H** (7 preguntas obligatorias + síntesis opcional) y D4 con los **5 Porqués** (mínimo 3 obligatorios + causa raíz identificada), en el formulario y en el detalle.
7. Instructivo actualizado con las nuevas reglas, herramientas y el PDF.

**Otros archivos:** `supabase_schema.sql` agrega la tabla `configuracion`; hay que volver a ejecutarlo en Supabase (es seguro ejecutarlo de nuevo). README actualizado.

**Verificación:** sintaxis JS validada; 50 pruebas funcionales en navegador simulado (flujo completo de 8 etapas con firmas, áreas, SST, 8D, generación real del PDF), todas correctas.

### Solicitud 9
> D3 · Acciones de contención: ingresar acción, punto de control, fecha de realización y responsable. D5 · Acciones correctivas permanentes: ingresar causa, acción correctiva, fecha de realización y responsable. Elaborar instructivo de diligenciamiento del 8D, dejando clara la diferencia entre contención, corrección y acción correctiva, con ejemplos en cada paso. Incluir Seguridad y Salud en el Trabajo conservando la estructura que se tenía anteriormente.

**Qué se hizo en `index.html`:**
1. **D3** es ahora una tabla de acciones (Acción de contención · Punto de control · Fecha de realización · Responsable), con botón para agregar filas y quitar filas. El responsable sugiere los nombres de los usuarios, pero admite texto libre. Se exige al menos una fila completa y ninguna a medias. El campo de texto anterior queda como "Observaciones (opcional)".
2. **D5** igual, con Causa · Acción correctiva · Fecha de realización · Responsable.
3. Ambas tablas están en el formulario de creación, en el detalle del registro y en el PDF de trazabilidad. El detalle muestra en un aviso exactamente qué le falta al 8D.
4. **Instructivo del 8D** (en la vista Instructivo y en una ventana emergente con el botón "¿Cómo diligenciarlo?" dentro del 8D, sin perder lo diligenciado): tabla comparativa **Contención / Corrección / Acción correctiva / Acción preventiva** (qué hace, pregunta que responde, cuándo, duración, dónde se registra y ejemplos de calidad y de SST), regla práctica para distinguirlas, paso a paso D1–D8 con qué es, cómo se diligencia, ejemplo con un caso guía (anclajes soldados del módulo A-12) y errores a evitar, y lista de verificación antes de enviar. Las correcciones se registran en D3 escribiendo "Corrección:" al inicio.
5. **Seguridad y Salud en el Trabajo** vuelve como área (la 8.ª de la lista) con su estructura anterior: sus tipos son las 7 clases de peligro con su descripción, aparece "Condición de seguridad específica" cuando el tipo es "Condiciones de seguridad", se muestran EPP, procedimientos alternativos y compañero de apoyo, y siempre la evalúa y firma el Líder de SST. Se conserva además la casilla SST para casos de otras áreas. Se quitó la regla que convertía los registros antiguos de SST en "Dirección de Operaciones". Si la base de datos ya tenía la lista de áreas guardada, el área SST se agrega sola una vez.

**Verificación:** 60 pruebas funcionales correctas (incluye filas de D3/D5 en formulario y detalle, bloqueo de envío sin D5, área SST, ventana del instructivo y PDF), y revisión visual del 8D, de la ventana del instructivo y del PDF.

### Solicitud 10
> Al seleccionar Seguridad y Salud en el Trabajo en "2. Clasificación y proyecto", la Condición de seguridad específica debe habilitarse debajo del Tipo específico, con opciones de selección para cada tipo específico según la clasificación del Anexo A de la GTC 45.

**Qué se hizo en `index.html`:**
- Con el área SST, debajo de "Tipo específico" aparece una lista obligatoria con la descripción del peligro de la tabla del Anexo A de la GTC 45, que cambia según el tipo elegido:
  - Biológico (8): virus, bacterias, hongos, ricketsias, parásitos, picaduras, mordeduras, fluidos o excrementos.
  - Físico (7): ruido, iluminación, vibración, temperaturas extremas, presión atmosférica, radiaciones ionizantes y no ionizantes.
  - Químico (6): polvos orgánicos e inorgánicos, fibras, líquidos (nieblas y rocíos), gases y vapores, humos metálicos y no metálicos, material particulado.
  - Psicosocial (6): gestión organizacional, características de la organización del trabajo, características del grupo social de trabajo, condiciones de la tarea, interfase persona–tarea, jornada de trabajo.
  - Biomecánico (4): postura, esfuerzo, movimiento repetitivo, manipulación manual de cargas.
  - Condiciones de seguridad (8): mecánico, eléctrico, locativo, tecnológico, accidentes de tránsito, públicos, trabajo en alturas, espacios confinados.
  - Fenómenos naturales (6): sismo, terremoto, vendaval, inundación, derrumbe, precipitaciones.
- El título del campo se ajusta: "Condición de seguridad específica (GTC 45)" para Condiciones de seguridad, y "Clasificación específica del peligro … (GTC 45)" para los demás.
- En otras áreas con la casilla SST marcada, la misma clasificación aparece en el bloque SST según la clase de peligro elegida.
- El valor se guarda en el registro y se muestra en el detalle y en el PDF.

**Verificación:** 70 pruebas funcionales correctas y revisión visual del formulario.

### Solicitud 11
> ¿Cómo actualizo Supabase?

**Respuesta:** ejecutar una vez `supabase_schema.sql` en Supabase → SQL Editor → New query → Run (crea la tabla `configuracion`, no borra datos) y abrir `index.html` desde la carpeta del proyecto. La aplicación migra sola los datos existentes.

### Solicitud 12
> Crear rol "Coordinador(a) SST" y actualizar todos los archivos de las carpetas guardadas en el contexto.

**Decisión de la usuaria:** el Coordinador(a) SST es **alterno del Líder de SST**.

**Qué se hizo en `index.html`:**
- Nuevo rol **Coordinador(a) SST** (9 roles en total), disponible al crear y editar usuarios, con usuario de ejemplo "Coordinación SST (ejemplo)".
- Tiene las mismas funciones que el Líder de SST: solo ve los registros relacionados con SST, edita el concepto de SST, puede avanzar la etapa 3 y firmar "Etapa 3 · Evaluación de SST". Basta la firma de uno de los dos; la firma guarda quién firmó y con qué rol, y así aparece en el registro y en el PDF.
- Instructivo, textos de ayuda, bitácora y README actualizados.

**Archivos actualizados:** `index.html`, `README.md` (reescrito con el estado actual), `HISTORIAL.md`, los dos `Historial del proyecto.md` de `C:\COWORK\Gestión de proyectos` y la nota de contexto del proyecto en Claude.

**Verificación:** 75 pruebas funcionales correctas (incluye flujo completo con la firma SST hecha por el Coordinador(a) SST).

---

## Sesión 4 — 01/10/2026

### Solicitud 13
> Actualizar: 1. Información del solicitante (fecha y hora, nombre y apellido, cargo, área según organigrama, proceso, Responsable del proceso, Líder de proceso). 2. Clasificación y proyecto (solicitud dirigida al área de; solicitud relacionada con temas de; tipo específico de desviación; OT; nombre del proyecto; línea de negocio; figura; nivel de criticidad). 3. Ciclo: Solicitud, Evaluación, Aprobación, Cierre. 4. Roles: Administrador, Solicitante, Responsable del proceso, Aprobador autorizado, Líder de proceso. 5. Ejemplo de flujo SST (solicita → Responsable del proceso evalúa y aprueba con firma → Aprobador autorizado revisa y aprueba con firma → Líder de proceso cierra con observaciones y firma) y replicarlo para los demás tipos de solicitud.

**Qué se hizo en `index.html`:**
1. **Sección 1** en el orden pedido. Se quitaron tipo y número de documento. "Responsable del proceso" y "Líder de proceso" son listas de usuarios con esos roles; se sugieren automáticamente según el área a la que va dirigida la solicitud.
2. **Sección 2** en el orden pedido. "Solicitud dirigida al área de" define quién gestiona; "Solicitud relacionada con temas de" define los tipos específicos (por defecto igual al área, se puede cambiar). Si el tema es SST: tipos = clases de peligro, clasificación GTC 45 bajo el tipo y bloque de EPP / procedimientos / compañero de apoyo. Ya no existe la casilla "relacionado con SST": lo define el tema.
3. **Ciclo de 4 etapas**: Solicitud (firma del solicitante; pasa sola a Evaluación) → Evaluación (Responsable del proceso: concepto de evaluación, medidas de control y 8D completo si es derogación; aprueba con firma) → Aprobación (Aprobador autorizado: observaciones opcionales; aprueba con firma, o devuelve a Evaluación o rechaza con motivo) → Cierre (Líder de proceso: observaciones de cierre y cumplimiento de controles obligatorios; cierra con firma). La firma hace avanzar la etapa (ya no hay botón "Avanzar etapa") y prepara el correo al siguiente responsable. El Administrador solo puede retroceder etapas (anula firmas) y dar visto bueno opcional.
4. **5 roles**. Se retiraron Líder de Calidad, Líder de SST, Coordinador(a) SST, Responsable de ejecución y Responsable de seguimiento. Usuarios existentes en la base de datos se convierten solos: Líder de Calidad → Responsable del proceso de Calidad Producto; Líder de SST y Coordinador(a) SST → Responsable del proceso de SST; Responsable de ejecución y de seguimiento → Líder de proceso. Visibilidad: Responsable del proceso ve su área o lo asignado; Líder de proceso ve lo asignado o su área; Aprobador y Administrador ven todo.
5. **Ejemplos de flujo** en el Instructivo para los 8 temas (SST, Calidad Producto, Producción, Ingeniería mecánica, Ingeniería Automatización y Control, Ingeniería de Software, Dirección de Operaciones, Logística y Almacén), cada uno con las 4 etapas. Los registros de ejemplo MTC-001 a MTC-005 siguen esos casos en distintas etapas (MTC-001 SST cerrado de punta a punta).
6. Detalle del registro reorganizado por secciones y etapas; PDF y correos actualizados al nuevo modelo. Los registros del ciclo anterior se migran solos (etapas 1-4 → Evaluación, 5 → Aprobación, 6-7 → Cierre, 8 → cerrado).
7. Instructivo reescrito: ciclo, roles, alcance del Aprobador, paso a paso por rol y ejemplos de flujo.

**Verificación:** 43 pruebas funcionales del nuevo flujo (formulario, asignaciones, firmas que hacen avanzar, requisitos por etapa, devolución, 8D, visibilidad, migración, PDF) y revisión visual.

---

## Sesión 5 — 02/10/2026

### Solicitud 14
> Modificar roles. Permitir guardar avances de diligenciamiento y consultarlos para terminar después. Ciclo: Solicitud → Evaluación y Aprobación → Cierre. 1) Solicitud: la diligencia y firma el Responsable del proceso; pasa de inmediato a Evaluación. 2) Evaluación y Aprobación: la realiza el Aprobador autorizado (concepto de evaluación, medidas de control y, en derogaciones, el 8D completo). 3) Cierre: observaciones de cierre y cumplimiento de controles, lo hace el Responsable del proceso que hizo la solicitud. Guardar los cambios en todos los archivos de ambas carpetas vinculadas. Permitir descargar histórico de registros en Excel.

**Interpretación (indicada a la usuaria):** con el nuevo ciclo quedan 3 roles: Administrador, Responsable del proceso y Aprobador autorizado. Se retiran Solicitante y Líder de proceso (sus usuarios pasan a Responsable del proceso). En "1. Información del solicitante" se retiran las listas "Responsable del proceso" y "Líder de proceso", porque quien diligencia es el Responsable del proceso.

**Qué se hizo en `index.html`:**
1. **Ciclo de 3 etapas.** Al firmar y enviar, la solicitud pasa a *Evaluación y Aprobación*. El Aprobador autorizado registra concepto, medidas de control y observaciones (se guardan solos al salir de cada campo), revisa o completa el 8D y firma ("Evaluar, aprobar y firmar") → pasa a *Cierre*. El Responsable del proceso que hizo la solicitud registra observaciones de cierre y cumplimiento de controles y firma → cerrada. Solo el dueño puede cerrar.
2. **Devolver para ajustes:** el Aprobador devuelve con motivo; la solicitud vuelve a *Solicitud*, se anulan sus firmas y aparece en los borradores del Responsable como "Devuelta para ajustes"; él la corrige y la reenvía con nueva firma conservando el mismo consecutivo. También puede rechazarla.
3. **Borradores:** botón "Guardar borrador" (sin firma ni campos obligatorios). Los borradores y devueltas aparecen al inicio de "Nuevo registro" con "Continuar" y "Eliminar", y un contador en el menú; al continuar se recarga todo (datos, 8D, tablas D3/D5, adjuntos). Solo los ve su dueño. El consecutivo se asigna al enviar.
4. **Histórico en Excel:** botón "Descargar histórico (Excel)" en Registros, con hojas *Registros* (36 columnas: datos, clasificación, evaluación, aprobación, cierre, estado), *Bitácora* y *Acciones 8D*, con filtros y anchos de columna. Usa SheetJS desde internet; sin conexión descarga CSV.
5. **Roles y visibilidad:** Responsable del proceso ve sus solicitudes y las dirigidas a su área; Aprobador y Administrador ven todo. El Aprobador no crea solicitudes. El Administrador puede retroceder de Cierre a Evaluación (anula la firma de aprobación).
6. Instructivo, ejemplos de flujo de los 8 temas, PDF, correos y registros de ejemplo actualizados al nuevo ciclo. Los registros del ciclo anterior se migran solos (Evaluación/Aprobación → Evaluación y Aprobación; Cierre → Cierre).

**Verificación:** 44 pruebas funcionales (borradores, envío, devolución y reenvío, aprobación, cierre por el dueño, PDF, Excel con sus 3 hojas, migración) y revisión visual en navegador.

### Solicitud 15
> Activar botón de "Editando" para poder continuar con el borrador guardado.

**Qué se hizo en `index.html`:**
- El botón del borrador ya no queda deshabilitado: dice **"Continuar editando"** en los borradores que no están abiertos, y **"Editando — recargar"** en el que está abierto (vuelve a cargar en el formulario lo último guardado).
- Corregido: al salir de "Nuevo registro" y volver, el formulario aparecía vacío aunque el borrador figuraba como "Editando". Ahora el borrador abierto se vuelve a cargar siempre en el formulario.

**Verificación:** 47 pruebas funcionales correctas (incluye salir y volver al borrador y recargarlo con el botón).

### Solicitud 16
> Actualizar todos los cambios realizados a la fecha en la carpeta de Cowork de esta computadora y conectar con Supabase.

**Qué se hizo:** se actualizó la carpeta `C:\Cowork\Gestión de desviaciones y derogaciones` del equipo laptop-fmhkshl5, que tenía la primera versión (28/09): `index.html` (versión vigente con todos los cambios hasta la Solicitud 15), `config.js` con la conexión a Supabase (proyecto `ngwsvtlgripohebhtbxs`; antes tenía la plantilla sin datos), `supabase_schema.sql` (con la tabla `configuracion`), `README.md`, `HISTORIAL.md` y la copia de `Claude outputs\index.html`. Ambas carpetas quedan iguales.

---

## Sesión 6 — 09/10/2026

### Solicitud 17
> Retirar de la aplicación "Solicitud relacionada con temas de", pero conservar "Tipo específico de desviación".

**Qué se hizo en `index.html`:**
- Se retiró el campo "Solicitud relacionada con temas de" del formulario, del detalle del registro, del PDF, del correo y del Excel.
- "Tipo específico de desviación" se conserva y ahora depende de **"Solicitud dirigida al área de"**: muestra los tipos de esa área. Quedó al lado del área, con la clasificación GTC 45 debajo cuando el área es Seguridad y Salud en el Trabajo (y el bloque de EPP, procedimientos y compañero de apoyo).
- Los registros anteriores no pierden nada: el dato interno de tema se conserva solo por compatibilidad (los que tenían tema SST siguen tratándose como SST).
- Instructivo actualizado.

**Verificación:** 53 pruebas funcionales correctas y revisión visual del formulario.

---

## Sesión 7 — 25/10/2026

### Solicitud 18
> Crear opción para compartir la aplicación con enlace, usuario y contraseña una vez creado el usuario y rol. Permitir al administrador borrar registros creados, pero dejar huella o registro de quién lo hizo. Enviar correo de notificación de creación de usuario con enlace de acceso, usuario (correo) y contraseña temporal con opción de cambiarla. En "Solicitud relacionada con temas de" permitir que el usuario digite en caso de no encontrar una opción que se ajuste a su reporte. Reemplazar "Tipo específico de desviación" por "Tipo específico de Desviación o Derogación" y permitir digitar si no se halla en la lista. Cuando se registre una derogación, permitir que sea temporal o definitiva: si es temporal, registrar rango de fechas; si es definitiva, registrar la fecha a partir de la cual se hará efectiva de forma permanente.

Decisiones tomadas con la usuaria: ingreso con **Supabase Auth**; correo de bienvenida abriendo el **correo del Administrador** (mailto); se **restituye** "Solicitud relacionada con temas de" con la opción "Otro".

**Qué se hizo en `index.html`:**
- **Ingreso con usuario y contraseña:** pantalla de ingreso (correo y contraseña), "¿Olvidó su contraseña?" (enlace de recuperación de Supabase), activación del primer Administrador, cambio obligatorio de la contraseña temporal en el primer ingreso, botón "Cambiar contraseña" y "Cerrar sesión". Con sesión ya no aparece la lista para cambiar de usuario (solo en modo local).
- **Usuarios:** al crear un usuario se genera la cuenta con contraseña temporal sin cerrar la sesión del Administrador y aparece la tarjeta "Comparta el acceso" (enlace, usuario, contraseña temporal, rol y área) con "Enviar correo de bienvenida" (se abre automáticamente), "Copiar datos de acceso" y "Compartir por WhatsApp". Columna "Acceso" (Activo / Pendiente de primer ingreso / Sin acceso) y botones "Crear acceso", "Compartir" y "Restablecer contraseña". Nuevo campo "Enlace de acceso a la aplicación".
- **Eliminar registros (solo Administrador):** botón en el detalle, exige motivo y guarda la huella (quién, rol, correo, fecha, motivo y copia del registro sin el contenido de los adjuntos) en la tabla `registros_eliminados`. Nuevo menú "Registros eliminados" con opción de restaurar (queda constancia en la bitácora). Si la tabla no existe, no se permite eliminar. El Excel del Administrador incluye la hoja "Eliminados".
- **Formulario:** "Solicitud relacionada con temas de" (por defecto el área; opción "Otro (escribir)"). "Tipo específico de Desviación o Derogación" con opción "Otro (escribir)". Los textos escritos se guardan, se muestran en el detalle, PDF, correo y Excel.
- **Derogación temporal o definitiva:** temporal pide rango desde–hasta (valida que el fin no sea anterior); definitiva pide la fecha efectiva permanente y no genera alertas de vencimiento. El Aprobador o el dueño pueden ajustar el alcance durante la Evaluación y Aprobación (queda en la bitácora). Los registros anteriores de derogación quedan como temporales.
- Instructivo actualizado (ingreso y contraseñas; derogación temporal o definitiva; funciones del Administrador).

**`supabase_schema.sql`:** nueva tabla `registros_eliminados` (sin permiso de borrado) y acceso solo para usuarios con sesión (se retiran las políticas anónimas). **Debe ejecutarse de nuevo.**

**`README.md`:** pasos de puesta en marcha (SQL, proveedor Email de Supabase con "Confirm email" desactivado, Site URL, publicación en Netlify/GitHub Pages y activación del Administrador).

**Verificación:** 83 pruebas funcionales en modo local y 21 pruebas del ingreso con un Supabase simulado (activación del Administrador, usuario no registrado, contraseña incorrecta, creación de cuenta sin perder la sesión, primer ingreso con cambio obligatorio, cambio voluntario, recuperación, huella de eliminación). Revisión visual de la pantalla de ingreso, del formulario, de Usuarios y del detalle.

### Estado actual del aplicativo (`index.html`, 25/10/2026)
- Figuras: **Desviación** y **Derogación** (la derogación exige el 8D completo para aprobarse).
- Ciclo de 3 etapas: Solicitud (Responsable del proceso) → Evaluación y Aprobación (Aprobador autorizado) → Cierre (Responsable del proceso que hizo la solicitud). Cada etapa se firma y avanza sola; devolución para ajustes y rechazo con motivo.
- 3 roles: Administrador, Responsable del proceso, Aprobador autorizado. Ingreso con usuario (correo) y contraseña (Supabase Auth); el Administrador crea y comparte los accesos.
- Eliminación de registros por el Administrador con huella de auditoría y restauración.
- Derogación temporal (rango de fechas) o definitiva (fecha efectiva). Tema y tipo específico con opción «Otro (escribir)».
- Borradores (guardar y continuar después) y solicitudes devueltas para ajustes.
- Histórico en Excel (Registros, Bitácora, Acciones 8D) y PDF de trazabilidad al cierre.
- 8 áreas editables; el tipo específico depende del área a la que va dirigida; área SST con clasificación GTC 45. 8D con 5W2H, contención, 5 Porqués y acciones correctivas; instructivo y ejemplos de flujo por tema.
- Persistencia: Supabase (`config.js`), tablas `registros`, `usuarios`, `tipos_desviacion`, `configuracion` y `registros_eliminados`; acceso solo con sesión.

### Pendientes / próximos pasos
- Validar con SST la lista de clasificación GTC 45 contra la norma.
- Ejecutar el nuevo `supabase_schema.sql`, configurar el proveedor Email de Supabase, publicar la aplicación y activar la cuenta del Administrador (ver README).
- Sincronizar `C:\COWORK\Gestión de proyectos` (equipo p-lramirez1) con la Solicitud 18 cuando ese equipo esté conectado.

---

## Sesión 8 — 29/10/2026

### Solicitud 19
> Dejar la aplicación lista para trabajar, compartirla con los usuarios (falta el enlace de acceso) y garantizar que guarde los cambios. Todo gratis, sin tarjeta, y que no se llene de golpe ni se pierda información.

**Qué se decidió:**
- Se revisó todo el proyecto y se encontraron fallas de seguridad y de guardado (ver el plan). Antes de compartir el enlace conviene corregirlas.
- La aplicación se publicará en **Cloudflare Pages** (gratis) desde este mismo repositorio de GitHub.
- La base de datos sigue en **Supabase gratis**, con copia de seguridad diaria fuera de Supabase y una consulta diaria para que no se pause por falta de uso.
- Los archivos adjuntos y las firmas saldrán de la base de datos para que no se llene. Dónde se guardarán a largo plazo (Google Drive u OneDrive) se define cuando la clienta confirme qué correo usa la empresa.
- El trabajo se hace en la rama `feat/v2`. **La aplicación actual (`index.html`) no se modificó** y sigue funcionando igual.

**Qué se hizo en esta sesión:**
1. **Base de datos nueva** (carpeta `supabase/migrations/`):
   - `0001_tablas_y_permisos.sql`: tablas nuevas y permisos por rol y por área. Cada persona solo ve lo que le corresponde, y nadie puede cambiarse el rol.
   - `0002_funciones.sql`: crear solicitud con consecutivo automático (no se repite), guardar sin pisar los cambios de otra persona, eliminar dejando huella y ver el espacio usado.
2. **Reglas del procedimiento en archivos separados** (`src/`): firmas por etapa, 8D, vigencias, quién ve qué, fechas con hora de Colombia y protección de enlaces. Son las mismas reglas de antes, ahora con pruebas.
3. **51 pruebas automáticas** (`npm test`): 24 de las reglas y 27 de la base de datos. Las de la base de datos usan un PostgreSQL de prueba que corre en el computador, sin tocar Supabase.

**Todavía no se ha hecho** (se retoma al tener acceso al Supabase de la clienta): exportar los datos actuales, probar en el proyecto de pruebas, migrar los datos, firmar y avanzar de etapa desde la base de datos, adjuntos, respaldos y publicación.

**Avance del mismo día — el flujo del procedimiento ya vive en la base de datos** (`0003_flujo.sql`):
- Firmar la evaluación y el cierre, devolver para ajustes, rechazar, retroceder una etapa (solo Administrador), enviar borradores y reenviar solicitudes devueltas, convertir una desviación en derogación, ajustar el alcance de una derogación, restaurar registros eliminados, registrar adjuntos y renombrar áreas.
- Ahora la base de datos exige las reglas que antes solo revisaba la pantalla: cada rol firma solo su etapa, el cierre lo firma quien hizo la solicitud, una derogación no se aprueba con el 8D incompleto y cada rol solo llena sus propios campos.
- Mejoras de seguridad que no estaban en el plan original: tope de tamaño para lo que se guarda, máximo de 5 MB y 50 archivos por registro, rutas de archivos validadas, no se puede quitar ni desactivar al último Administrador, y el correo de una persona no se puede cambiar desde la aplicación.
- Las pruebas pasaron de 51 a 87. Una de ellas encontró un error real en el SQL (un texto suelto que PostgreSQL leía como lista) y ya está corregido.
- Se comprobó que las reglas del 8D y de las fechas en SQL dicen exactamente lo mismo que las de la pantalla.

**Más avance del mismo día:**
- Se cerraron dos huecos de seguridad antes de que existieran: nadie puede anotar en su registro el archivo de otro, ni usar la imagen de firma de otra persona. Cada archivo vive en la carpeta de su registro y cada firma en la de quien firma.
- Los archivos se guardan en un bucket privado (`0004_almacenamiento.sql`): máximo 5 MB, solo documentos e imágenes, y no se pueden reemplazar ni borrar desde la aplicación.
- Nuevo paso `0000`: si el Supabase ya tiene las tablas de la versión anterior, las aparta como `*_v1` (con todos sus datos) y las cierra. Sin él, las tablas nuevas no se habrían creado.
- Módulo para convertir los datos de la versión anterior al modelo nuevo (`src/migracion/`): registros de cualquier modelo antiguo, personas, áreas, tipos, firmas, adjuntos y registros eliminados. Se probó guardando el resultado en la base nueva y restaurando un registro migrado.
- 124 pruebas automáticas.
- Se crearon `PLAN.md` (qué falta y cómo va) y `CLAUDE.md` (reglas del equipo).

**Migración de datos lista para ensayar:**
- Comando `scripts/migrar-v1-a-v2.mjs` con tres pasos: `exportar` (copia la versión anterior a archivos), `simular` (dice qué se migraría y qué avisos hay, sin escribir nada) y `aplicar` (guarda todo en la base nueva).
- Se puede repetir sin duplicar. Se niega a pisar una base que ya tiene registros y pide el identificador del proyecto, para no migrar en el equivocado por error.
- Nuevo paso `0005`: continúa el consecutivo después del último número usado (incluidos los registros eliminados) y nunca retrocede.
- 154 pruebas. Falta correrlo contra un Supabase real.
