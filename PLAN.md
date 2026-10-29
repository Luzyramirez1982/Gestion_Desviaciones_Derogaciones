# Plan del proyecto — Gestión de Desviaciones y Derogaciones (MATEC)

Este documento es la guía para quien se una al proyecto: qué se quiere lograr, qué decisiones se tomaron, qué ya está hecho y qué falta.
**Cuando termines algo, marca la casilla y actualiza la fecha de abajo.** Los detalles de cada cambio van en [HISTORIAL.md](HISTORIAL.md); las reglas de trabajo, en [CLAUDE.md](CLAUDE.md).

_Última actualización: 29/10/2026_

Leyenda: `[x]` hecho · `[~]` en curso · `[ ]` pendiente · 🔑 necesita acceso a las cuentas de la clienta (Supabase, Cloudflare, GitHub)

---

## 1. Qué se quiere lograr

La clienta (C.I. Matec Logística) usa una aplicación para gestionar **desviaciones y derogaciones** de proceso: cada solicitud pasa por tres etapas (Solicitud → Evaluación y Aprobación → Cierre), con firma en cada una, y las derogaciones exigen un reporte 8D.

Lo que pidió: dejar la aplicación **lista para trabajar, compartirla con sus usuarios** (falta el enlace de acceso) y **garantizar que guarde los cambios**, sin perder información, sin retrasos y **sin costo**, porque no puede pagar planes ni registrar tarjetas.

La revisión del proyecto encontró fallas que ponían en riesgo justo eso (ver sección 4). Por eso, antes de compartir el enlace, se está reconstruyendo la parte de datos y seguridad.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Publicación | **Cloudflare Pages** (gratis), conectado a este repositorio de GitHub. El enlace será `<nombre>.pages.dev`. |
| Base de datos | **Supabase gratis**, con respaldo diario fuera de Supabase y una consulta diaria para que no se pause por inactividad. |
| Costos | Todo gratis y **sin tarjeta**. Si algo exige tarjeta, no se usa. |
| Archivos (adjuntos y firmas) | Fuera de la base de datos, en un bucket privado. Se empieza en Supabase Storage (1 GB) con imágenes comprimidas. Cuando la clienta diga qué correo usa la empresa, se agrega Google Drive u OneDrive (más espacio, también gratis). |
| Código | Se separa el `index.html` gigante en módulos con **Vite**, conservando la interfaz y las reglas actuales. No se reescribe en otro framework. |
| Datos que ya existen | Se **migran** (la clienta ya hizo pruebas en su Supabase). Las tablas viejas se conservan como `*_v1`. |
| Seguridad | Los permisos los exige la **base de datos** (no solo la pantalla): por rol, por área y por etapa. |
| Ramas | Todo el trabajo va en `feat/v2`. `main` es lo que se publica; no se toca hasta el cambio final. |

## 3. Cómo está armado

```
Cloudflare Pages (la aplicación)  ──►  Supabase (gratis)
                                         ├─ Auth: ingreso con correo y contraseña (registro abierto APAGADO)
                                         ├─ Base de datos: tablas con permisos por rol + funciones que revisan las reglas
                                         ├─ Función del servidor: crear y restablecer usuarios (solo Administrador)
                                         └─ Storage privado: adjuntos e imágenes de firmas
GitHub Actions (cada día) ──► copia cifrada de la base y de los archivos a un repositorio privado aparte
```

Dónde está cada cosa en el repositorio:

| Carpeta o archivo | Qué contiene |
|---|---|
| `index.html`, `config.js`, `supabase_schema.sql` | La aplicación **actual** (versión 1). No se modifica hasta el cambio final. |
| `supabase/migrations/` | La base de datos nueva, en 5 pasos numerados (0000 a 0004). |
| `src/dominio/` | Las reglas del procedimiento (etapas, firmas, 8D, vigencias, quién ve qué). |
| `src/util/` | Fechas con hora de Colombia y protección de enlaces. |
| `src/migracion/` | Convierte los datos de la versión 1 al modelo nuevo. |
| `tests/` | Pruebas automáticas (124). |

## 4. Fallas que se están corrigiendo

| Falla de la versión 1 | Cómo se corrige | Estado |
|---|---|---|
| Cualquier persona con la clave pública podía registrarse y leer, editar o borrar todo. | Permisos por rol y área en la base de datos; registro abierto apagado. | Base de datos `[x]` · apagar registro en Supabase `[ ]` 🔑 |
| Dos personas creando solicitudes a la vez recibían el mismo consecutivo y una pisaba a la otra. | Consecutivo asignado por la base de datos. | `[x]` |
| Ediciones simultáneas se pisaban sin aviso. | Control de versión: avisa en vez de sobrescribir. | Base de datos `[x]` · aviso en pantalla `[ ]` |
| Errores al guardar no se mostraban. | Indicador "Guardando / Guardado / Error", reintentos. | `[ ]` |
| Adjuntos y firmas dentro del registro llenaban los 500 MB y volvían lenta la app. | Archivos aparte, comprimidos, con límites. | Base de datos `[x]` · pantalla `[ ]` |
| Fechas con hora de Londres (desde las 7 p. m. mostraba el día siguiente). | Fechas con hora de Colombia. | Reglas `[x]` · uso en la pantalla `[ ]` |
| Enlaces con código malicioso posible (XSS). | Enlaces validados y textos escapados. | Funciones `[x]` · uso en la pantalla `[ ]` |
| Datos de ejemplo con correos reales subían a producción. | Datos de ejemplo solo en modo demostración. | `[ ]` |
| Las reglas (quién firma, 8D completo) solo las revisaba la pantalla. | Las revisa la base de datos. | `[x]` |

---

## 5. Avance por fases

### Fase 0 — Preparación y resguardo
- [x] Repositorio identificado: `Luzyramirez1982/Gestion_Desviaciones_Derogaciones` (cuenta de la clienta).
- [x] Rama de trabajo `feat/v2` creada y publicada.
- [ ] Confirmar que el repositorio sea **privado**. 🔑
- [ ] **Exportar los datos actuales** del Supabase de la clienta (las 5 tablas en JSON y la lista de cuentas de acceso). Es la copia de seguridad inicial. 🔑
- [ ] Crear el proyecto Supabase de **pruebas (staging)** para ensayar sin tocar el real. 🔑
- [ ] Preguntar a la clienta: ¿el correo de la empresa es Google o Microsoft? ¿Qué nombre quiere para el enlace? 🔑

### Fase 1 — Base de datos nueva (`supabase/migrations/`)
- [x] `0000_apartar_version_anterior.sql`: aparta las tablas viejas como `*_v1` y las deja cerradas.
- [x] `0001_tablas_y_permisos.sql`: tablas, permisos por rol y área, último Administrador protegido, consecutivo.
- [x] `0002_funciones.sql`: crear, guardar (con control de versión), eliminar con huella, espacio usado.
- [x] `0003_flujo.sql`: firmar, devolver, rechazar, retroceder, enviar, restaurar, convertir a derogación, ajustar alcance, adjuntos, renombrar áreas.
- [x] `0004_almacenamiento.sql`: bucket privado de archivos (5 MB, solo documentos e imágenes).
- [x] Pruebas de todo lo anterior sobre un PostgreSQL de prueba (incluye partir de una base con la versión 1).
- [ ] Ejecutar las migraciones en el Supabase de **pruebas** y repetir las pruebas allí (hasta ahora solo se probó en un PostgreSQL simulado). 🔑
- [ ] Activar actualización en vivo (Realtime) en la tabla `registros` para que varias personas vean los cambios sin recargar.
- [ ] **Función del servidor para usuarios** (`supabase/functions/admin-usuarios`): crear cuenta con contraseña temporal, restablecer contraseña y desactivar. Solo la puede llamar un Administrador. La clave `service_role` queda como secreto, nunca en la aplicación.
- [ ] Script para crear el **primer Administrador** (reemplaza la "activación" desde la pantalla).
- [ ] En Supabase: apagar *Allow new users to sign up*, exigir contraseñas de 8+ caracteres con letras y números, configurar *Site URL* y *Redirect URLs*. 🔑
- [ ] Activar verificación en dos pasos (TOTP, gratis) para las cuentas de Administrador. 🔑

### Fase 2 — Aplicación nueva con Vite (misma interfaz, mismas reglas)
- [x] `src/dominio/`: constantes del procedimiento, 8D, firmas, vigencias, visibilidad. Con pruebas.
- [x] `src/util/`: fechas de Colombia y enlaces seguros. Con pruebas.
- [ ] Montar Vite (`index.html` pasa a ser solo la entrada) con versiones fijas de supabase-js, jsPDF y xlsx.
- [ ] Capa de datos: cliente de Supabase y funciones que llaman a las del servidor (reemplazan `dbLoadAll` y `dbSave*`).
- [ ] Ingreso, cambio y recuperación de contraseña (reutilizar la lógica actual de `index.html`).
- [ ] Vistas: panel, lista (con paginación y filtros en la base), nuevo registro, detalle, usuarios, tipos, registros eliminados, instructivo.
- [ ] Guardado confiable: indicador de estado, reintentos, aviso de conflicto de versión, aviso al cerrar con cambios sin guardar.
- [ ] Adjuntos y firmas: subir a Storage, compresión de fotos en el navegador (máx. 1600 px), descarga con enlace temporal.
- [ ] PDF de trazabilidad y Excel histórico con los archivos desde Storage.
- [ ] Panel **"Uso del almacenamiento"** para el Administrador (la función ya existe en la base de datos), con avisos al 70 % y 90 %.
- [ ] Campo **"Enlace de acceso a la aplicación"**: que se llene solo con la dirección publicada (es lo que pidió la clienta).
- [ ] Modo demostración (datos de ejemplo) separado de producción.
- [ ] Pruebas de recorrido completo en el navegador (Playwright).

### Fase 3 — Migración de los datos de la versión 1
- [x] `src/migracion/v1a2.js`: convierte registros (incluso de modelos muy antiguos), personas, áreas, tipos, firmas, adjuntos y huellas de eliminados. Avisa de lo que no se puede migrar.
- [x] Pruebas: la conversión, guardarla en la base nueva y restaurar un registro migrado.
- [ ] `scripts/migrar-v1-a-v2.mjs`: lee la exportación, hace una **simulación** (informe sin escribir nada) y luego aplica: sube los archivos a Storage y carga las tablas. Se puede repetir sin duplicar.
- [ ] Crear las cuentas de acceso de las personas que no la tienen (el informe las lista como "sin cuenta").
- [ ] Ensayar todo en pruebas y comparar conteos y una muestra de registros. 🔑
- [ ] Hacerlo en el proyecto real, conservando las tablas `*_v1` hasta que la clienta confirme que todo está bien. 🔑

### Fase 4 — Respaldos y continuidad (gratis)
- [ ] GitHub Actions diario: copia de la base de datos **cifrada** y de los archivos hacia un **segundo repositorio privado**, guardando 90 días o más.
- [ ] La misma tarea evita que Supabase se pause por inactividad.
- [ ] Aviso si el respaldo falla.
- [ ] Procedimiento de restauración escrito y **probado** en pruebas.
- [ ] Revisar el correo de recuperación de contraseña: el correo integrado de Supabase gratis es muy limitado (confirmar en el proyecto real). Plan: que el Administrador restablezca contraseñas desde la aplicación y, si hace falta, configurar un servicio de correo gratuito. 🔑

### Fase 5 — Publicación y entrega
- [ ] Cloudflare Pages conectado al repositorio: `main` publica; las demás ramas generan vistas previas contra pruebas. 🔑
- [ ] Cabeceras de seguridad (CSP y otras) en Cloudflare.
- [ ] Crear el primer Administrador y cargar el enlace en Usuarios → Enlace de acceso. 🔑
- [ ] Recorrido final desde celular y computador: primer ingreso con contraseña temporal, recuperación de contraseña, firmar, cerrar, PDF y Excel.
- [ ] Manual corto del Administrador (usuarios, espacio usado, respaldos, restaurar) y actualizar `README.md`.
- [ ] Fusionar `feat/v2` en `main` y retirar el `index.html` antiguo.

### Fase 6 — Mejoras opcionales
- [ ] Adaptador de adjuntos a Google Drive u OneDrive (según el correo de la empresa).
- [ ] Archivo anual: mover adjuntos de registros cerrados hace mucho al respaldo para liberar espacio.
- [ ] Validar con SST la lista de clasificación GTC 45 (pendiente desde la versión 1).

---

## 6. Lo que necesitamos de la clienta

1. Acceso de colaborador a su **Supabase** (o la exportación de las tablas), a **Cloudflare** y a **GitHub**.
2. Confirmar que el repositorio sea **privado**.
3. Si el correo de la empresa es **Google o Microsoft**.
4. El **nombre** que quiere para el enlace.

## 7. Puntos de atención

- Las migraciones SQL se probaron en un PostgreSQL simulado, **no en un Supabase real**. Lo primero al tener acceso es ejecutarlas en pruebas.
- El plan gratuito de Supabase se **pausa tras 7 días sin uso**: por eso el respaldo diario también "despierta" la base.
- Límites gratuitos: 500 MB de base de datos y 1 GB de archivos. Con archivos aparte y comprimidos alcanza para miles de registros, pero el panel de uso debe estar activo antes de entregar.
- Las tablas `*_v1` no se borran hasta que la clienta confirme. Mientras la versión 1 siga publicada, dejará de funcionar apenas se ejecute el paso `0000` en el proyecto real: hacerlo solo el día del cambio.

## 8. Cómo probar lo que ya está

```bash
npm install     # una sola vez
npm test        # corre las 124 pruebas (tardan unos 5 segundos, no necesitan internet)
```
