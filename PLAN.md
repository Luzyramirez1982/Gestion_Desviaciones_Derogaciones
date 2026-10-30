# Plan del proyecto — Gestión de Desviaciones y Derogaciones (MATEC)

Guía para quien se una al proyecto: qué se quiere lograr, qué se decidió, qué está hecho y qué falta.
**Cuando termines algo, marca la casilla y cambia la fecha.** Detalle de cada sesión: [HISTORIAL.md](HISTORIAL.md). Reglas de trabajo: [CLAUDE.md](CLAUDE.md).

_Última actualización: 30/10/2026 (pruebas de extremo a extremo)_

Leyenda: `[x]` hecho · `[~]` en curso · `[ ]` pendiente · 🔑 necesita acceso a una cuenta de la clienta

## 1. Qué se quiere lograr
La clienta (C.I. Matec Logística) necesita una aplicación para gestionar **desviaciones y derogaciones**, lista para trabajar, compartida con sus usuarios (falta el enlace de acceso) y que **guarde los cambios sin perder información**. Todo gratis y **sin tarjeta**: no puede pagar planes.

## 2. Decisiones tomadas
| Tema | Decisión |
|---|---|
| Arranque | **Desde cero (pedido de la clienta, 29/10/2026):** no se migran datos de la versión 1; solo existirá su usuario como Administradora. |
| Publicación | Cloudflare Pages (gratis) desde este repositorio. |
| Base de datos | **Neon** (Postgres gratis, sin tarjeta) con su ingreso (Managed Better Auth) y su Data API. Supabase descartado; lo hecho con él quedó en la marca `referencia-supabase`. Los archivos van al bucket de Neon (`uploads`) por una función de servidor; la base solo anota cuáles existen (tabla `archivos`). Detalle en la sección 4. |
| Respaldo | Copia cifrada **cada noche** de la base y de los archivos nuevos del bucket, con GitHub Actions (guardada 90 días fuera de Neon). **No hay segunda base en paralelo**: la copia se restaura en otro proyecto de Neon o en otro PostgreSQL si hace falta (`docs/RESPALDOS.md`). |
| Interfaz | Aplicación con Vite en `src/`, una pantalla por archivo y estilos separados por tema, para que un socio mejore lo visual. |
| Costos | Todo gratis y sin tarjeta. Si algo pide tarjeta, no se usa. |

## 3. Estado actual
- [x] Interfaz completa en modo demostración: ingreso, panel, lista (filtros y paginación), formulario de nuevo registro (8D, firma, borradores), detalle (firmas, devolver, rechazar, retroceder), usuarios, tipos y áreas, registros eliminados, instructivo, uso del almacenamiento.
- [x] Reglas del procedimiento en `src/dominio/` (etapas, firmas, 8D, vigencias, quién ve qué) con pruebas.
- [x] Guardado confiable en pantalla: indicador, reintentos y aviso de conflicto de versión.
- [x] PDF de trazabilidad y Excel histórico.
- [x] Compresión de fotos y límites de archivo (5 MB).
- [x] Cabeceras de seguridad para Cloudflare (`public/_headers`).
- [x] Estilos separados por tema en `src/estilos/`.
- [x] 281 pruebas automáticas (unitarias y de base de datos), 0 vulnerabilidades, compilación correcta.
- [x] 20 pruebas de extremo a extremo con un navegador real (Playwright): ingreso, el ciclo completo de una Desviación (crear → evaluar/aprobar → cerrar), una Derogación que exige el 8D completo antes de aprobar, devolver y rechazar, permisos por rol y por área, las pantallas de Administrador (usuarios, tipos, áreas, eliminados, uso del almacenamiento, instructivo) y la descarga real de PDF y Excel. Corren en modo demostración (sin tocar ninguna base real). `npm run test:e2e`.

## 4. Base de datos: Neon
Lo que debe cumplir (aprendido con la versión 1) y cómo se cubre:
| Requisito | Cómo |
|---|---|
| Gratis, sin tarjeta, que no se pause | Neon Free; el cómputo se duerme a los 5 min sin uso y despierta solo (no hay pausa de proyecto). |
| Seguridad por rol, área y etapa en el servidor | RLS y funciones en `db/migraciones/` (0001–0003). Una cuenta de ingreso sin perfil no ve nada. |
| Consecutivo `MTC-###` sin repetir y control de versión | Secuencia y `version` en la base (0001–0002). |
| Huella de eliminados que nadie borra | Tabla `auditoria_eliminados`, solo lectura para el Administrador. |
| Archivos de hasta 5 MB, privados | Bucket `uploads` (privado) + función `functions/archivos`: valida la sesión y le pregunta a la base (0004 y 0006), que decide con las reglas del registro. |
| Cuentas solo por el Administrador | `admin.createUser` de Neon + `crear_perfil` (0005). |
| Respaldo fuera del proveedor | `docs/respaldo-diario.yml` → `docs/RESPALDOS.md`. |

- [x] Elegir la base de datos (Neon) y escribirlo aquí.
- [x] Reglas de seguridad y del flujo portadas a Neon, con pruebas (`db/migraciones/`, `tests/basedatos`, `flujo`, `archivos`, `usuarios`, `catalogo_inicial`).
- [x] Adaptador `src/datos/neon.js` con pruebas contra la base de prueba (`tests/datos_neon.test.js`); la aplicación lo usa cuando existe `VITE_NEON_URL`.
- [x] Scripts: `aplicar-migraciones`, `cargar-catalogo`, `crear-primer-admin` (`scripts/`).
- [x] Archivos privados: el bucket no es público; se abren con un enlace que solo existe en el navegador de quien los pide.
- [x] Respaldo diario cifrado: plantilla y guía de restauración escritas.
- [x] Cabeceras de seguridad con `*.neon.tech` en `connect-src`.
- [x] **Probado contra un Neon real** (resultados en `docs/NEON_PASOS.md`).
- [x] Proyecto de Neon, Data API, migraciones y catálogo aplicados (8 áreas, 35 tipos).
- [~] Perfil de la Administradora creado con `scripts/crear-primer-admin.mjs`. Falta que ella ingrese por primera vez con la contraseña temporal (a propósito no se ha usado esa cuenta, para que sea ella quien ponga su propia contraseña) y confirmar con ella el catálogo inicial. 🔑
- [x] **Archivos en el bucket de Neon** (`uploads`, 5 GB): una función de servidor (`functions/archivos/`) guarda las claves, valida la sesión y le pregunta a la base si hay permiso; la base anota qué archivo existe (migraciones 0006 y 0007). Probado contra el Neon real y desplegado.
- [ ] **Publicar de nuevo el sitio** con `VITE_ARCHIVOS_URL` (`npm run build` y `npx wrangler pages deploy dist --project-name desviaciones-matec --branch main`): la dirección de la función queda escrita dentro del sitio. 🔑
- [x] El respaldo nocturno copia también los archivos del bucket (`scripts/respaldo-archivos.mjs`, `scripts/restaurar-archivos.mjs`, probados contra el bucket real); la copia de la base sola no los trae.
- [ ] Probar si crear cuentas sigue funcionando con el registro abierto apagado (`--disable-sign-up true`) y apagarlo.
- [ ] Pantalla de «nueva contraseña» y correo de envío propio para «¿Olvidó su contraseña?» (hoy la Administradora restablece).
- [ ] Primeras consultas tras un rato sin uso (el procesador gratis de Neon se duerme a los 5 min): a veces no reconocen la sesión. Las lecturas completas en una consulta y los reintentos lo cubren; falta la causa raíz (¿plan de pago sin «dormir», o reporte a Neon?).
- [x] Plantilla del respaldo corregida para Postgres 18 (la 17 fallaba) y para conservar los permisos al restaurar; guía de restauración con el formato de dos archivos.
- [x] Flujo en `.github/workflows/respaldo.yml` (rama `feat/v2`). `main` no se toca (guarda el ejemplo de la versión 1).
- [ ] En GitHub: poner el repositorio en privado, cambiar la **rama por defecto a `feat/v2`** (las tareas programadas solo corren desde ahí), cargar los secretos (`BACKUP_PASSPHRASE`, `NEON_DB_URL` y los cinco del bucket: `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`), lanzarlo a mano **marcando «todo»** y **ensayar una restauración** (base y archivos) en un proyecto de prueba. 🔑
- [ ] Correo de «¿Olvidó su contraseña?»: configurar SMTP propio en Neon (el compartido tiene límite) o dejar que el Administrador restablezca.
- [ ] Actualización en vivo: por ahora no hay (se refresca al volver a la pestaña) para no gastar horas de cómputo gratuitas. Revisar con el consumo real.
- [ ] Revisar los 11 avisos de `npm audit` que trae el SDK de Neon (`@neondatabase/neon-js`): vienen de sus dependencias de servidor y de componentes de pantalla que la aplicación no usa; confirmar con el equipo de Neon o actualizar cuando publiquen una versión corregida.
## 5. Pendiente: calidad del código y lo visual
- [x] Un solo árbol `src/` con carpetas por responsabilidad.
- [x] Dividir los archivos grandes (`vistas/formulario.js`, `vistas/detalle.js`, `vistas/ayuda.js`, `componentes/ui.js`) en piezas de una sola responsabilidad. Revisado con ESLint (`no-undef`) sobre todo `src/`.
- [x] Mejora visual con solo CSS (LuisBrito-11), ya dentro de `feat/v2`; corregidos el desborde del Instructivo en celular y los contrastes (HISTORIAL, sesión 13).
- [ ] Revisión visual con ojos humanos de las pantallas (la revisión automática midió desbordes y contrastes, no la estética).
- [ ] Accesibilidad: las etiquetas (`<label>`) de los formularios no están asociadas a su campo (falta `for`/`id`); se nota, por ejemplo, en el ingreso (correo y contraseña). Quien usa un lector de pantalla no puede saltar al campo tocando la etiqueta. Hallazgo de las pruebas E2E de hoy.

## 6. Pendiente: publicación y entrega
- [ ] Publicar en Cloudflare Pages (`npm run build`, carpeta `dist`). 🔑
- [ ] Probar desde celular y computador: primer ingreso y recuperación de contraseña contra el Neon real (firmar, cerrar, PDF y Excel ya quedaron cubiertos por las pruebas E2E automáticas).
- [ ] Actualizar `docs/MANUAL_ADMINISTRADOR.md` con la base elegida y entregarlo.
- [ ] Fusionar `feat/v2` en `main`.

## 7. Lo que necesitamos de la clienta
1. Nombre completo y correo de su usuario Administradora.
2. Confirmar el catálogo inicial de áreas y tipos.
3. El nombre que quiere para el enlace (`<nombre>.pages.dev`) y acceso a Cloudflare. 🔑
